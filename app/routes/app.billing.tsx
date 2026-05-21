import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Badge,
  Button,
  Banner,
  List,
  Divider,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import {
  getShopSubscription,
  getShopPlan,
  createSubscription,
  upsertShopSubscription,
  cancelShopSubscription,
  cancelSubscriptionOnShopify,
  getBillingPlans,
} from "~/lib/billing.server";
import {
  PLANS,
  PLAN_FREE,
  PLAN_STANDARD,
  PLAN_PREMIUM,
  type PlanName,
} from "~/lib/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [currentPlan, subscription] = await Promise.all([
    getShopPlan(shop),
    getShopSubscription(shop),
  ]);
  const plans = getBillingPlans();

  return json({
    currentPlan,
    plans,
    subscription: subscription
      ? {
          ...subscription,
          createdAt: subscription.createdAt.toISOString(),
          updatedAt: subscription.updatedAt.toISOString(),
        }
      : null,
    shop,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "subscribe") {
    const plan = formData.get("plan") as PlanName;
    if (!PLANS[plan] || plan === PLAN_FREE) {
      return json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const appUrl = process.env.SHOPIFY_APP_URL || "";
    const isTest = process.env.SHOPIFY_BILLING_TEST === "true";
    const returnUrl = `${appUrl}/api/billing/callback?plan=${plan}&shop=${shop}`;

    const result = await createSubscription(admin, plan, returnUrl, isTest);

    if (result.userErrors && result.userErrors.length > 0) {
      return json({ error: result.userErrors[0].message }, { status: 400 });
    }

    if (!result.confirmationUrl || !result.appSubscription) {
      return json({ error: "Failed to create subscription" }, { status: 500 });
    }

    await upsertShopSubscription(shop, plan, result.appSubscription.id, "PENDING");

    return json({ confirmationUrl: result.confirmationUrl });
  }

  if (intent === "cancel") {
    const subscription = await getShopSubscription(shop);
    if (subscription?.subscriptionId) {
      try {
        await cancelSubscriptionOnShopify(admin, subscription.subscriptionId);
      } catch (e) {
        console.error("Failed to cancel on Shopify:", e);
      }
    }
    await cancelShopSubscription(shop);
    return json({ cancelled: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

function PlanCard({
  planKey,
  plan,
  currentPlan,
  onSubscribe,
  onCancel,
  isLoading,
}: {
  planKey: PlanName;
  plan: (typeof PLANS)[PlanName];
  currentPlan: PlanName;
  onSubscribe: (plan: PlanName) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const isCurrent = planKey === currentPlan;
  const isDowngrade = planKey === PLAN_FREE && currentPlan !== PLAN_FREE;

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg" fontWeight="bold">
              {plan.name}
            </Text>
            {isCurrent && <Badge tone="success">Current Plan</Badge>}
          </InlineStack>
          <Text as="p" variant="headingXl" fontWeight="bold">
            {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
          </Text>
        </BlockStack>

        <Divider />

        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="subdued">
            {plan.maxActiveTimers === Number.MAX_SAFE_INTEGER
              ? "Unlimited active timers"
              : `Up to ${plan.maxActiveTimers} active timer${plan.maxActiveTimers !== 1 ? "s" : ""}`}
          </Text>
          <List type="bullet">
            {plan.features.map((f) => (
              <List.Item key={f}>{f}</List.Item>
            ))}
          </List>
        </BlockStack>

        <Box>
          {isCurrent ? (
            <Button disabled fullWidth>
              Current Plan
            </Button>
          ) : isDowngrade ? (
            <Button
              tone="critical"
              variant="secondary"
              fullWidth
              onClick={onCancel}
              loading={isLoading}
            >
              Cancel Subscription
            </Button>
          ) : (
            <Button
              variant="primary"
              fullWidth
              onClick={() => onSubscribe(planKey)}
              loading={isLoading}
            >
              {currentPlan === PLAN_FREE ? "Subscribe" : "Upgrade"} to {plan.name}
            </Button>
          )}
        </Box>
      </BlockStack>
    </Card>
  );
}

export default function BillingPage() {
  const { currentPlan, plans, subscription } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  // useFetcher handles Shopify embedded app session auth automatically
  const subscribeFetcher = useFetcher<typeof action>();
  const cancelFetcher = useFetcher<typeof action>();

  // Track WHICH plan is being subscribed to so only that button shows loading
  const [subscribingPlan, setSubscribingPlan] = useState<PlanName | null>(null);

  const isSubscribing = subscribeFetcher.state !== "idle";
  const isCancelling = cancelFetcher.state !== "idle";

  // Reset tracked plan when fetcher goes idle
  useEffect(() => {
    if (subscribeFetcher.state === "idle") {
      setSubscribingPlan(null);
    }
  }, [subscribeFetcher.state]);

  const success = searchParams.get("success") === "true";
  const cancelled = searchParams.get("cancelled") === "true";
  const errorParam = searchParams.get("error") === "true";

  // Get error from fetcher response
  const subscribeError =
    subscribeFetcher.data && "error" in subscribeFetcher.data
      ? subscribeFetcher.data.error
      : null;

  // When we get a confirmationUrl, break out of the iframe
  useEffect(() => {
    if (
      subscribeFetcher.data &&
      "confirmationUrl" in subscribeFetcher.data &&
      subscribeFetcher.data.confirmationUrl
    ) {
      window.open(subscribeFetcher.data.confirmationUrl, "_top");
    }
  }, [subscribeFetcher.data]);

  // After cancel, reload so the loader re-fetches the updated plan
  useEffect(() => {
    if (
      cancelFetcher.data &&
      "cancelled" in cancelFetcher.data &&
      cancelFetcher.data.cancelled
    ) {
      window.location.href = "/app/billing?cancelled=true";
    }
  }, [cancelFetcher.data]);

  const handleSubscribe = (plan: PlanName) => {
    setSubscribingPlan(plan);
    const formData = new FormData();
    formData.set("intent", "subscribe");
    formData.set("plan", plan);
    subscribeFetcher.submit(formData, { method: "post" });
  };

  const handleCancel = () => {
    const formData = new FormData();
    formData.set("intent", "cancel");
    cancelFetcher.submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Plans & billing"
      subtitle="Choose the Timer Mint plan that matches your growth stage"
    >
      <Layout>
        {success && (
          <Layout.Section>
            <Banner tone="success" title="Subscription activated!">
              Your plan has been upgraded successfully.
            </Banner>
          </Layout.Section>
        )}
        {cancelled && (
          <Layout.Section>
            <Banner tone="info" title="Subscription cancelled">
              Your subscription has been cancelled. You&apos;re now on the Free plan.
            </Banner>
          </Layout.Section>
        )}
        {(errorParam || subscribeError) && (
          <Layout.Section>
            <Banner tone="critical" title="Something went wrong">
              {subscribeError ||
                "There was an error processing your subscription. Please try again."}
            </Banner>
          </Layout.Section>
        )}

        {subscription && subscription.status === "PENDING" && (
          <Layout.Section>
            <Banner tone="warning" title="Subscription pending">
              Your subscription approval is pending. Please complete the billing
              confirmation.
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 1, md: 3 }} gap="400">
            <PlanCard
              planKey={PLAN_FREE}
              plan={plans[PLAN_FREE]}
              currentPlan={currentPlan as PlanName}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
              isLoading={isCancelling}
            />
            <PlanCard
              planKey={PLAN_STANDARD}
              plan={plans[PLAN_STANDARD]}
              currentPlan={currentPlan as PlanName}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
              isLoading={subscribingPlan === PLAN_STANDARD && isSubscribing}
            />
            <PlanCard
              planKey={PLAN_PREMIUM}
              plan={plans[PLAN_PREMIUM]}
              currentPlan={currentPlan as PlanName}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
              isLoading={subscribingPlan === PLAN_PREMIUM && isSubscribing}
            />
          </InlineGrid>
        </Layout.Section>

        {subscription && subscription.plan !== PLAN_FREE && (
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Current Subscription
                </Text>
                <Text as="p" variant="bodyMd">
                  Plan: <strong>{subscription.plan}</strong> &mdash; Status:{" "}
                  <strong>{subscription.status}</strong>
                </Text>
                {subscription.subscriptionId && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Subscription ID: {subscription.subscriptionId}
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
