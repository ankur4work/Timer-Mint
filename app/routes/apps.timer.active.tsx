import { json, type LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";

/**
 * App Proxy endpoint for fetching active timers
 * URL: /apps/timer/active (via app proxy)
 *
 * Shopify App Proxy headers:
 * - X-Shopify-Shop-Domain: shop domain
 * - X-Shopify-Hmac-Sha256: HMAC signature for verification
 * - X-Shopify-Logged-In-Customer-Id: customer ID if logged in
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Get shop from Shopify proxy headers
  const shop = request.headers.get("X-Shopify-Shop-Domain");

  // Validate shop header
  if (!shop) {
    return json(
      { error: "Unauthorized", timers: [] },
      {
        status: 401,
        headers: getCorsHeaders(),
      }
    );
  }

  try {
    const now = new Date();

    // Fetch active timers for this shop
    const timers = await prisma.timer.findMany({
      where: {
        shop: shop,
        status: "ACTIVE",
        OR: [
          // Fixed timers (was COUNTDOWN): currently running (started and not ended)
          {
            type: { in: ["FIXED", "COUNTDOWN"] },
            AND: [
              {
                OR: [
                  { startDate: null },
                  { startDate: { lte: now } },
                ],
              },
              { endDate: { gt: now } },
            ],
          },
          // Evergreen timers: always show (duration-based)
          {
            type: "EVERGREEN",
            evergreenDuration: { not: null },
          },
          // Recurring timers (was DAILY_RECURRING/DAILY)
          {
            type: { in: ["RECURRING", "DAILY_RECURRING", "DAILY"] },
            AND: [
              {
                OR: [
                  { startDate: null },
                  { startDate: { lte: now } },
                ],
              },
              {
                OR: [
                  { endDate: null },
                  { endDate: { gt: now } },
                ],
              },
            ],
          },
          // Cart timers: always fetch, filtering happens client-side
          {
            type: "CART",
          },
          // Shipping timers: always show
          {
            type: "SHIPPING",
          },
        ],
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        startDate: true,
        endDate: true,
        timezone: true,
        // Evergreen timer fields
        evergreenDuration: true,
        evergreenResetDelay: true,
        // Recurring timer fields
        dailyStartTime: true,
        dailyEndTime: true,
        recurringDays: true,
        // Shipping timer fields
        shippingCutoffTime: true,
        shippingExcludedDays: true,
        shippingHolidays: true,
        shippingNextDayText: true,
        // Cart timer fields
        cartThreshold: true,
        cartTimerDuration: true,
        // Expired text
        expiredText: true,
        // Content
        preText: true,
        postText: true,
        linkUrl: true,
        linkText: true,
        // Display settings
        backgroundColor: true,
        textColor: true,
        accentColor: true,
        position: true,
        animation: true,
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
        showLabels: true,
        closeButton: true,
        stickyOnScroll: true,
        // Targeting
        showOnAllPages: true,
        targetPages: true,
        excludePages: true,
      },
    });

    // Filter recurring timers by time of day (server-side pre-filter, client handles final decision)
    const filteredTimers = timers.filter(timer => {
      if (timer.type === "DAILY_RECURRING" || timer.type === "RECURRING" || timer.type === "DAILY") {
        return isDailyTimerActive(timer, now);
      }
      return true;
    });

    // Format timers for frontend
    const formattedTimers = filteredTimers.map(timer => ({
      id: timer.id,
      name: timer.name,
      type: timer.type,
      endDate: timer.endDate?.toISOString() || null,
      startDate: timer.startDate?.toISOString() || null,
      timezone: timer.timezone,
      // Evergreen timer fields
      evergreenDuration: timer.evergreenDuration,
      evergreenResetDelay: timer.evergreenResetDelay,
      // Recurring timer fields
      dailyStartTime: timer.dailyStartTime,
      dailyEndTime: timer.dailyEndTime,
      recurringDays: timer.recurringDays,
      // Shipping timer fields
      shippingCutoffTime: timer.shippingCutoffTime,
      shippingExcludedDays: timer.shippingExcludedDays,
      shippingHolidays: timer.shippingHolidays,
      shippingNextDayText: timer.shippingNextDayText,
      // Cart timer fields
      cartThreshold: timer.cartThreshold,
      cartTimerDuration: timer.cartTimerDuration,
      // Content
      preText: timer.preText,
      postText: timer.postText,
      linkUrl: timer.linkUrl,
      linkText: timer.linkText,
      // Display settings
      backgroundColor: timer.backgroundColor,
      textColor: timer.textColor,
      accentColor: timer.accentColor,
      position: timer.position,
      animation: timer.animation,
      showDays: timer.showDays,
      showHours: timer.showHours,
      showMinutes: timer.showMinutes,
      showSeconds: timer.showSeconds,
      showLabels: timer.showLabels,
      closeButton: timer.closeButton,
      stickyOnScroll: timer.stickyOnScroll,
      // Targeting
      showOnAllPages: timer.showOnAllPages,
      targetPages: timer.targetPages,
      excludePages: timer.excludePages,
      // Expired text (use DB value or default)
      expiredText: timer.expiredText || "Offer expired!",
    }));

    return json(
      { timers: formattedTimers },
      {
        headers: {
          ...getCorsHeaders(),
          // Cache for 60 seconds for performance
          "Cache-Control": "public, max-age=60, s-maxage=60",
          "Vary": "X-Shopify-Shop-Domain",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching active timers:", error);
    return json(
      { error: "Internal server error", timers: [] },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

/**
 * Check if a daily recurring timer is currently active based on time of day
 */
function isDailyTimerActive(timer: { dailyStartTime: string | null; dailyEndTime: string | null; timezone: string | null }, now: Date): boolean {
  if (!timer.dailyStartTime || !timer.dailyEndTime) {
    return true; // No time restrictions, always active
  }

  try {
    // Get current time in timer's timezone
    const timezone = timer.timezone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const currentTimeStr = formatter.format(now);
    const [currentHour, currentMinute] = currentTimeStr.split(":").map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    // Parse start and end times (format: "HH:MM")
    const [startHour, startMinute] = timer.dailyStartTime.split(":").map(Number);
    const [endHour, endMinute] = timer.dailyEndTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight timers (e.g., 22:00 - 06:00)
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return true; // On error, show the timer
  }
}

/**
 * Get CORS headers for app proxy responses
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Shop-Domain",
    "Content-Type": "application/json",
  };
}

/**
 * Handle OPTIONS preflight requests
 */
export async function action({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
