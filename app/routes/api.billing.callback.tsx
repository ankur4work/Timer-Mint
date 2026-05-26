import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { upsertShopSubscription } from "~/lib/billing.server";
import { PLANS, type PlanName } from "~/lib/plans";

function buildBillingRedirect(
  shop: string | null,
  host: string | null,
  status: "success" | "error",
) {
  const params = new URLSearchParams();
  if (shop) {
    params.set("shop", shop);
  }
  if (host) {
    params.set("host", host);
  }
  params.set(status, "true");
  return redirect(`/app/billing?${params.toString()}`);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") as PlanName | null;
  const chargeId = url.searchParams.get("charge_id");
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  if (!chargeId || !plan || !PLANS[plan] || !shop) {
    console.error("Billing callback: missing params", { chargeId, plan, shop, host });
    return buildBillingRedirect(shop, host, "error");
  }

  try {
    const gid = chargeId.startsWith("gid://")
      ? chargeId
      : `gid://shopify/AppSubscription/${chargeId}`;

    await upsertShopSubscription(shop, plan, gid, "ACTIVE");
    return buildBillingRedirect(shop, host, "success");
  } catch (error) {
    console.error("Billing callback error:", error);
    return buildBillingRedirect(shop, host, "error");
  }
};
