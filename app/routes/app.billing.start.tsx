import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import {
  createSubscription,
  upsertShopSubscription,
} from "~/lib/billing.server";
import { PLAN_FREE, PLANS, type PlanName } from "~/lib/plans";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") as PlanName | null;

  if (!plan || !PLANS[plan] || plan === PLAN_FREE) {
    throw redirect("/app/billing?error=true");
  }

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const isTest = process.env.SHOPIFY_BILLING_TEST === "true";
  const returnUrl = `${appUrl}/api/billing/callback?plan=${plan}&shop=${session.shop}`;

  const result = await createSubscription(admin, plan, returnUrl, isTest);

  if (result.userErrors?.length || !result.confirmationUrl || !result.appSubscription) {
    console.error("Billing start failed", {
      shop: session.shop,
      plan,
      errors: result.userErrors,
    });
    throw redirect("/app/billing?error=true");
  }

  await upsertShopSubscription(session.shop, plan, result.appSubscription.id, "PENDING");

  throw redirect(result.confirmationUrl);
};
