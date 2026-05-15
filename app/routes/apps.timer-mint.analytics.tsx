import { json, type ActionFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";

/**
 * App Proxy endpoint for tracking timer analytics
 * URL: /apps/timer-mint/analytics (via app proxy)
 *
 * Accepts POST requests with beacon data for impressions and clicks
 */
export async function action({ request }: ActionFunctionArgs) {
  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  }

  // Only accept POST
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: getCorsHeaders() });
  }

  try {
    // Parse beacon data first (request.text() can only be called once)
    const body = await request.text();
    const data = JSON.parse(body);

    const { event, timerId } = data;

    if (!event || !timerId) {
      return json(
        { error: "Missing required fields" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate event type
    if (!["impression", "click"].includes(event)) {
      return json(
        { error: "Invalid event type" },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Get shop from Shopify proxy header (preferred) OR look up from DB by timer ID
    let shop = request.headers.get("X-Shopify-Shop-Domain");

    if (!shop) {
      // Fallback: resolve shop from the timer record itself
      const timer = await prisma.timer.findUnique({
        where: { id: timerId },
        select: { shop: true },
      });

      if (!timer) {
        return json(
          { error: "Timer not found" },
          { status: 404, headers: getCorsHeaders() }
        );
      }

      shop = timer.shop;
    }

    // Increment the appropriate counter
    const updateData = event === "impression"
      ? { impressions: { increment: 1 } }
      : { clicks: { increment: 1 } };

    await prisma.timer.update({
      where: { id: timerId, shop },
      data: updateData,
    });

    return json(
      { success: true },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("[Analytics] Failed to record event:", error);
    return json(
      { error: "Failed to record analytics" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

/**
 * Handle GET requests (not supported for analytics)
 */
export async function loader() {
  return json(
    { error: "Use POST method to submit analytics" },
    { status: 405, headers: getCorsHeaders() }
  );
}

/**
 * Get CORS headers for app proxy responses
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Shop-Domain",
    "Content-Type": "application/json",
  };
}
