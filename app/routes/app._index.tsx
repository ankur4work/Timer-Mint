import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  EmptyState,
  InlineStack,
  Box,
  Icon,
  Badge,
  ProgressBar,
  InlineGrid,
  Divider,
} from "@shopify/polaris";
import {
  ClockIcon,
  ViewIcon,
  ButtonIcon,
  SettingsIcon,
  PlusIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { formatTimerDate } from "~/utils/format";

interface DashboardStats {
  totalTimers: number;
  activeTimers: number;
  todayImpressions: number;
  todayClicks: number;
  recentTimers: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    endDate: string;
  }>;
  hasSettings: boolean;
  hasActiveTimer: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get timer counts
  const [totalTimers, activeTimers] = await Promise.all([
    prisma.timer.count({ where: { shop } }),
    prisma.timer.count({ where: { shop, status: "ACTIVE" } }),
  ]);

  // Get today's analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTimersList = await prisma.timer.findMany({
    where: { shop, status: "ACTIVE" },
    select: { impressions: true, clicks: true },
  });

  // Sum up impressions and clicks (simplified - in production would track daily)
  const todayImpressions = activeTimersList.reduce((sum, t) => sum + t.impressions, 0);
  const todayClicks = activeTimersList.reduce((sum, t) => sum + t.clicks, 0);

  // Get recent timers (top 5)
  const recentTimers = await prisma.timer.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      endDate: true,
    },
  });

  // Check if settings exist
  const settings = await prisma.settings.findUnique({
    where: { shop },
  });

  const stats: DashboardStats = {
    totalTimers,
    activeTimers,
    todayImpressions,
    todayClicks,
    recentTimers: recentTimers.map(t => ({
      ...t,
      endDate: t.endDate.toISOString(),
    })),
    hasSettings: !!settings,
    hasActiveTimer: activeTimers > 0,
  };

  return json({ stats, shop });
};

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.FunctionComponent;
  trend?: string;
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodySm" tone="subdued">
            {title}
          </Text>
          <Box>
            <Icon source={icon} tone="subdued" />
          </Box>
        </InlineStack>
        <Text as="p" variant="headingXl" fontWeight="bold">
          {value}
        </Text>
        {trend && (
          <Text as="span" variant="bodySm" tone="success">
            {trend}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge tone="success">Active</Badge>;
    case "INACTIVE":
      return <Badge tone="warning">Paused</Badge>;
    case "SCHEDULED":
      return <Badge tone="info">Scheduled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  const typeLabels: Record<string, string> = {
    FIXED: "Fixed",
    COUNTDOWN: "Countdown",
    EVERGREEN: "Evergreen",
    RECURRING: "Recurring",
    DAILY_RECURRING: "Recurring",
    DAILY: "Daily",
    CART: "Cart",
    SHIPPING: "Shipping",
  };
  return <Badge>{typeLabels[type] || type}</Badge>;
}

function SetupChecklist({
  hasTimer,
  hasActiveTimer,
  hasSettings,
}: {
  hasTimer: boolean;
  hasActiveTimer: boolean;
  hasSettings: boolean;
}) {
  const steps = [
    { label: "Create your first timer", done: hasTimer, url: "/app/timers/new" },
    { label: "Activate a timer", done: hasActiveTimer, url: "/app/timers" },
    { label: "Configure settings", done: hasSettings, url: "/app/settings" },
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const progress = (completedSteps / steps.length) * 100;

  if (completedSteps === steps.length) {
    return null; // All steps completed, hide checklist
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Get Started
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {completedSteps} of {steps.length} complete
          </Text>
        </InlineStack>

        <ProgressBar progress={progress} size="small" tone="primary" />

        <BlockStack gap="200">
          {steps.map((step, index) => (
            <InlineStack key={index} gap="300" blockAlign="center">
              <Box
                background={step.done ? "bg-fill-success" : "bg-surface-secondary"}
                borderRadius="full"
                padding="100"
              >
                {step.done ? (
                  <Icon source={CheckIcon} tone="success" />
                ) : (
                  <Box minWidth="16px" minHeight="16px" />
                )}
              </Box>
              <Box minWidth="0" style={{ flex: 1 }}>
                <Text as="span" variant="bodyMd" tone={step.done ? "subdued" : undefined}>
                  {step.done ? (
                    <s>{step.label}</s>
                  ) : (
                    <Link to={step.url} style={{ textDecoration: "none", color: "inherit" }}>
                      {step.label}
                    </Link>
                  )}
                </Text>
              </Box>
              {!step.done && (
                <Button size="slim" url={step.url}>
                  Start
                </Button>
              )}
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { stats } = useLoaderData<typeof loader>();

  // Show welcome state for new users
  if (stats.totalTimers === 0) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Welcome to Countdown Timer Bar!"
                action={{
                  content: "Create your first timer",
                  url: "/app/timers/new",
                }}
                secondaryAction={{
                  content: "Learn more",
                  url: "https://help.shopify.com",
                  external: true,
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    Create urgency and boost conversions with customizable countdown timer bars.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Choose from multiple timer types: fixed countdowns, evergreen timers, recurring schedules, cart timers, and shipping cutoffs.
                  </Text>
                </BlockStack>
              </EmptyState>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <SetupChecklist
              hasTimer={stats.totalTimers > 0}
              hasActiveTimer={stats.hasActiveTimer}
              hasSettings={stats.hasSettings}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Dashboard"
      primaryAction={{
        content: "Create Timer",
        url: "/app/timers/new",
        icon: PlusIcon,
      }}
    >
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <StatCard
              title="Active Timers"
              value={stats.activeTimers}
              icon={ClockIcon}
            />
            <StatCard
              title="Total Timers"
              value={stats.totalTimers}
              icon={ClockIcon}
            />
            <StatCard
              title="Total Impressions"
              value={stats.todayImpressions.toLocaleString()}
              icon={ViewIcon}
            />
            <StatCard
              title="Total Clicks"
              value={stats.todayClicks.toLocaleString()}
              icon={ButtonIcon}
            />
          </InlineGrid>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Quick Actions
              </Text>
              <InlineStack gap="300" wrap>
                <Button url="/app/timers/new" icon={PlusIcon}>
                  Create Timer
                </Button>
                <Button url="/app/timers" variant="secondary">
                  Manage Timers
                </Button>
                <Button url="/app/settings" variant="secondary" icon={SettingsIcon}>
                  Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Main Content Area */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Recent Timers
                </Text>
                <Button variant="plain" url="/app/timers">
                  View all
                </Button>
              </InlineStack>

              {stats.recentTimers.length > 0 ? (
                <BlockStack gap="300">
                  {stats.recentTimers.map((timer, index) => (
                    <Box key={timer.id}>
                      {index > 0 && <Divider />}
                      <Box paddingBlockStart={index > 0 ? "300" : "0"}>
                        <InlineStack align="space-between" blockAlign="center" wrap={false}>
                          <BlockStack gap="100">
                            <Link
                              to={`/app/timers/${timer.id}`}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <Text as="span" variant="bodyMd" fontWeight="semibold">
                                {timer.name}
                              </Text>
                            </Link>
                            <InlineStack gap="200">
                              {getTypeBadge(timer.type)}
                              <Text as="span" variant="bodySm" tone="subdued">
                                Ends: {formatTimerDate(timer.endDate)}
                              </Text>
                            </InlineStack>
                          </BlockStack>
                          <InlineStack gap="300" blockAlign="center">
                            {getStatusBadge(timer.status)}
                            <Button
                              variant="plain"
                              url={`/app/timers/${timer.id}`}
                            >
                              Edit
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Box>
                    </Box>
                  ))}
                </BlockStack>
              ) : (
                <Box paddingBlock="400">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No timers yet. Create your first timer to get started.
                    </Text>
                    <Button url="/app/timers/new">Create Timer</Button>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Setup Checklist (for users who haven't completed setup) */}
        {(!stats.hasActiveTimer || !stats.hasSettings) && (
          <Layout.Section variant="oneThird">
            <SetupChecklist
              hasTimer={stats.totalTimers > 0}
              hasActiveTimer={stats.hasActiveTimer}
              hasSettings={stats.hasSettings}
            />
          </Layout.Section>
        )}

        {/* Tips Card */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Tips
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodySm">
                  <strong>Evergreen timers</strong> create personalized countdowns for each visitor.
                </Text>
                <Text as="p" variant="bodySm">
                  <strong>Shipping timers</strong> show "order by" cutoffs to encourage same-day shipping.
                </Text>
                <Text as="p" variant="bodySm">
                  <strong>Cart timers</strong> only appear on cart pages to reduce abandonment.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
