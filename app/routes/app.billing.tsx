import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher, useNavigate } from "@remix-run/react";
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
import { useEffect } from "react";
import { authenticate } from "~/shopify.server";
import {
  getShopSubscription,
  getShopPlan,
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
  const navigate = useNavigate();
  const cancelFetcher = useFetcher<typeof action>();

  const isCancelling = cancelFetcher.state !== "idle";
  const success = searchParams.get("success") === "true";
  const cancelled = searchParams.get("cancelled") === "true";
  const errorParam = searchParams.get("error") === "true";

  useEffect(() => {
    if (
      cancelFetcher.data &&
      "cancelled" in cancelFetcher.data &&
      cancelFetcher.data.cancelled
    ) {
      navigate("/app/billing?cancelled=true");
    }
  }, [cancelFetcher.data, navigate]);

  const handleSubscribe = (plan: PlanName) => {
    window.open(`/app/billing/start?plan=${plan}`, "_top");
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
        {errorParam && (
          <Layout.Section>
            <Banner tone="critical" title="Something went wrong">
              There was an error processing your subscription. Please try again.
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
              isLoading={false}
            />
            <PlanCard
              planKey={PLAN_PREMIUM}
              plan={plans[PLAN_PREMIUM]}
              currentPlan={currentPlan as PlanName}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
              isLoading={false}
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
