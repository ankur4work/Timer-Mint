import { json, type LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";

/**
 * Public API endpoint for fetching active timers
 * URL: /api/timers/active?shop=myshop.myshopify.com
 *
 * This endpoint works without app proxy authentication
 * and is useful for development/testing.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // Validate shop parameter
  if (!shop) {
    return json(
      { error: "Missing shop parameter", timers: [] },
      {
        status: 400,
        headers: getCorsHeaders(),
      }
    );
  }

  // Basic validation for shop domain format
  if (!shop.includes(".myshopify.com") && !shop.includes(".shopify.com")) {
    return json(
      { error: "Invalid shop domain", timers: [] },
      {
        status: 400,
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
          // Fixed timers: currently running (started and not ended)
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
          // Recurring timers
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
          // Cart timers: always fetch
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
        evergreenDuration: true,
        evergreenResetDelay: true,
        dailyStartTime: true,
        dailyEndTime: true,
        recurringDays: true,
        shippingCutoffTime: true,
        shippingExcludedDays: true,
        shippingHolidays: true,
        shippingNextDayText: true,
        cartThreshold: true,
        cartTimerDuration: true,
        expiredText: true,
        preText: true,
        postText: true,
        linkUrl: true,
        linkText: true,
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
        showOnAllPages: true,
        targetPages: true,
        excludePages: true,
      },
    });

    // Format timers for frontend
    const formattedTimers = timers.map(timer => ({
      id: timer.id,
      name: timer.name,
      type: timer.type,
      endDate: timer.endDate?.toISOString() || null,
      startDate: timer.startDate?.toISOString() || null,
      timezone: timer.timezone,
      evergreenDuration: timer.evergreenDuration,
      evergreenResetDelay: timer.evergreenResetDelay,
      dailyStartTime: timer.dailyStartTime,
      dailyEndTime: timer.dailyEndTime,
      recurringDays: timer.recurringDays,
      shippingCutoffTime: timer.shippingCutoffTime,
      shippingExcludedDays: timer.shippingExcludedDays,
      shippingHolidays: timer.shippingHolidays,
      shippingNextDayText: timer.shippingNextDayText,
      cartThreshold: timer.cartThreshold,
      cartTimerDuration: timer.cartTimerDuration,
      preText: timer.preText,
      postText: timer.postText,
      linkUrl: timer.linkUrl,
      linkText: timer.linkText,
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
      showOnAllPages: timer.showOnAllPages,
      targetPages: timer.targetPages,
      excludePages: timer.excludePages,
      expiredText: timer.expiredText || "Offer expired!",
    }));

    return json(
      { timers: formattedTimers },
      {
        headers: {
          ...getCorsHeaders(),
          "Cache-Control": "public, max-age=60, s-maxage=60",
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
 * Get CORS headers for public API
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
