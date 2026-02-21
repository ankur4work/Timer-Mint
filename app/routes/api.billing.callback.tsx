import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { upsertShopSubscription } from "~/lib/billing.server";
import { PLANS, type PlanName } from "~/lib/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") as PlanName | null;
  const chargeId = url.searchParams.get("charge_id");
  const shop = url.searchParams.get("shop");

  // Build the full Shopify Admin embedded URL to redirect back into the app
  const shopSubdomain = shop?.replace(".myshopify.com", "") ?? "";
  const appKey = process.env.SHOPIFY_API_KEY ?? "";
  const embeddedBase = `https://admin.shopify.com/store/${shopSubdomain}/apps/${appKey}`;

  if (!chargeId || !plan || !PLANS[plan] || !shop) {
    console.error("Billing callback: missing params", { chargeId, plan, shop });
    if (shop) return redirect(`${embeddedBase}/app/billing?error=true`);
    return new Response("Bad Request", { status: 400 });
  }

  try {
    // Shopify ONLY redirects to returnUrl after the merchant approves billing —
    // a charge_id in the URL means the subscription was accepted.
    const gid = chargeId.startsWith("gid://")
      ? chargeId
      : `gid://shopify/AppSubscription/${chargeId}`;

    await upsertShopSubscription(shop, plan, gid, "ACTIVE");

    console.log(`Billing activated: shop=${shop} plan=${plan} gid=${gid}`);
    return redirect(`${embeddedBase}/app/billing?success=true`);
  } catch (err) {
    console.error("Billing callback error:", err);
    return redirect(`${embeddedBase}/app/billing?error=true`);
  }
};
