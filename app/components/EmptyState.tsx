import {
  Card,
  EmptyState as PolarisEmptyState,
  BlockStack,
  Text,
} from "@shopify/polaris";

interface EmptyStateProps {
  heading: string;
  description?: string;
  action?: {
    content: string;
    url?: string;
    onAction?: () => void;
  };
  secondaryAction?: {
    content: string;
    url?: string;
    onAction?: () => void;
  };
  image?: string;
  children?: React.ReactNode;
}

// Default empty state images
const EMPTY_STATE_IMAGES = {
  timers: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  analytics: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  search: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  default: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
};

/**
 * Reusable empty state component
 */
export function EmptyStateCard({
  heading,
  description,
  action,
  secondaryAction,
  image = EMPTY_STATE_IMAGES.default,
  children,
}: EmptyStateProps) {
  return (
    <Card>
      <PolarisEmptyState
        heading={heading}
        action={action}
        secondaryAction={secondaryAction}
        image={image}
      >
        {description && <p>{description}</p>}
        {children}
      </PolarisEmptyState>
    </Card>
  );
}

/**
 * Empty state for no timers
 */
export function NoTimersEmptyState() {
  return (
    <EmptyStateCard
      heading="Create your first countdown timer"
      action={{
        content: "Create timer",
        url: "/app/timers/new",
      }}
      image={EMPTY_STATE_IMAGES.timers}
    >
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd">
          Add countdown timers to your store to create urgency and boost conversions.
        </Text>
        <Text as="p" variant="bodyMd">
          Choose from multiple timer types: fixed countdowns, evergreen timers, recurring schedules, and more.
        </Text>
      </BlockStack>
    </EmptyStateCard>
  );
}

/**
 * Empty state for no search results
 */
export function NoSearchResultsEmptyState({
  onClearFilters,
}: {
  onClearFilters?: () => void;
}) {
  return (
    <EmptyStateCard
      heading="No timers found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={
        onClearFilters
          ? {
              content: "Clear filters",
              onAction: onClearFilters,
            }
          : undefined
      }
      image={EMPTY_STATE_IMAGES.search}
    />
  );
}

/**
 * Empty state for no analytics data
 */
export function NoAnalyticsEmptyState() {
  return (
    <EmptyStateCard
      heading="No analytics data yet"
      description="Analytics will appear here once your timers start getting views and clicks."
      action={{
        content: "View timers",
        url: "/app/timers",
      }}
      image={EMPTY_STATE_IMAGES.analytics}
    />
  );
}

/**
 * Generic inline empty state (no card wrapper)
 */
export function InlineEmptyState({
  heading,
  description,
  action,
}: {
  heading: string;
  description?: string;
  action?: {
    content: string;
    url?: string;
    onAction?: () => void;
  };
}) {
  return (
    <BlockStack gap="200" inlineAlign="center">
      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
        {heading}
      </Text>
      {description && (
        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
          {description}
        </Text>
      )}
      {action && (
        <div style={{ marginTop: "8px" }}>
          {action.url ? (
            <a
              href={action.url}
              style={{
                color: "var(--p-color-text-brand)",
                textDecoration: "none",
              }}
            >
              {action.content}
            </a>
          ) : (
            <button
              onClick={action.onAction}
              style={{
                background: "none",
                border: "none",
                color: "var(--p-color-text-brand)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {action.content}
            </button>
          )}
        </div>
      )}
    </BlockStack>
  );
}
