import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { upsertShopSubscription } from "~/lib/billing.server";
import { PLANS, type PlanName } from "~/lib/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") as PlanName | null;
  const chargeId = url.searchParams.get("charge_id");
  const shop = url.searchParams.get("shop");

  const redirectParams = new URLSearchParams();
  if (shop) {
    redirectParams.set("shop", shop);
  }

  if (!chargeId || !plan || !PLANS[plan] || !shop) {
    console.error("Billing callback: missing params", { chargeId, plan, shop });
    redirectParams.set("error", "true");
    return redirect(`/app/billing?${redirectParams.toString()}`);
  }

  try {
    const gid = chargeId.startsWith("gid://")
      ? chargeId
      : `gid://shopify/AppSubscription/${chargeId}`;

    await upsertShopSubscription(shop, plan, gid, "ACTIVE");

    console.log(`Billing activated: shop=${shop} plan=${plan} gid=${gid}`);
    redirectParams.set("success", "true");
    return redirect(`/app/billing?${redirectParams.toString()}`);
  } catch (err) {
    console.error("Billing callback error:", err);
    redirectParams.set("error", "true");
    return redirect(`/app/billing?${redirectParams.toString()}`);
  }
};
