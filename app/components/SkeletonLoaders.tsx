import {
  Card,
  BlockStack,
  SkeletonBodyText,
  SkeletonDisplayText,
  Box,
  InlineStack,
  InlineGrid,
} from "@shopify/polaris";

/**
 * Skeleton loader for a stat card
 */
export function SkeletonStatCard() {
  return (
    <Card>
      <BlockStack gap="200">
        <Box width="60%">
          <SkeletonBodyText lines={1} />
        </Box>
        <SkeletonDisplayText size="medium" />
      </BlockStack>
    </Card>
  );
}

/**
 * Skeleton loader for a stats grid (4 cards)
 */
export function SkeletonStatsGrid() {
  return (
    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </InlineGrid>
  );
}

/**
 * Skeleton loader for a timer list item
 */
export function SkeletonTimerRow() {
  return (
    <Box paddingBlock="200">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Box width="200px">
            <SkeletonDisplayText size="small" />
          </Box>
          <Box width="120px">
            <SkeletonBodyText lines={1} />
          </Box>
        </BlockStack>
        <InlineStack gap="200">
          <Box width="60px">
            <SkeletonBodyText lines={1} />
          </Box>
          <Box width="40px">
            <SkeletonBodyText lines={1} />
          </Box>
        </InlineStack>
      </InlineStack>
    </Box>
  );
}

/**
 * Skeleton loader for a timer list
 */
export function SkeletonTimerList({ count = 5 }: { count?: number }) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between">
          <Box width="120px">
            <SkeletonDisplayText size="small" />
          </Box>
          <Box width="60px">
            <SkeletonBodyText lines={1} />
          </Box>
        </InlineStack>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonTimerRow key={i} />
        ))}
      </BlockStack>
    </Card>
  );
}

/**
 * Skeleton loader for a form card
 */
export function SkeletonFormCard() {
  return (
    <Card>
      <BlockStack gap="400">
        <SkeletonDisplayText size="small" />
        <SkeletonBodyText lines={2} />
        <BlockStack gap="300">
          <SkeletonBodyText lines={1} />
          <Box background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
        </BlockStack>
        <BlockStack gap="300">
          <SkeletonBodyText lines={1} />
          <Box background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

/**
 * Skeleton loader for the settings page
 */
export function SkeletonSettingsPage() {
  return (
    <BlockStack gap="500">
      <SkeletonFormCard />
      <SkeletonFormCard />
      <SkeletonFormCard />
    </BlockStack>
  );
}

/**
 * Skeleton loader for the dashboard page
 */
export function SkeletonDashboard() {
  return (
    <BlockStack gap="500">
      <SkeletonStatsGrid />
      <Card>
        <BlockStack gap="400">
          <SkeletonDisplayText size="small" />
          <InlineStack gap="300">
            <Box width="100px" background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
            <Box width="100px" background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
            <Box width="100px" background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
          </InlineStack>
        </BlockStack>
      </Card>
      <SkeletonTimerList count={3} />
    </BlockStack>
  );
}

/**
 * Skeleton loader for the timer index table
 */
export function SkeletonTimerIndex() {
  return (
    <Card padding="0">
      <Box padding="400" borderBlockEndWidth="025" borderColor="border-subdued">
        <InlineStack align="space-between">
          <Box width="200px" background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
          <InlineStack gap="200">
            <Box width="80px" background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
            <Box width="80px" background="bg-surface-secondary" borderRadius="200" minHeight="36px" />
          </InlineStack>
        </InlineStack>
      </Box>
      <BlockStack gap="0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Box
            key={i}
            padding="400"
            borderBlockEndWidth="025"
            borderColor="border-subdued"
          >
            <InlineStack align="space-between" blockAlign="center">
              <Box width="150px">
                <SkeletonBodyText lines={1} />
              </Box>
              <Box width="80px">
                <SkeletonBodyText lines={1} />
              </Box>
              <Box width="60px">
                <SkeletonBodyText lines={1} />
              </Box>
              <Box width="100px">
                <SkeletonBodyText lines={1} />
              </Box>
              <Box width="100px">
                <SkeletonBodyText lines={1} />
              </Box>
            </InlineStack>
          </Box>
        ))}
      </BlockStack>
    </Card>
  );
}
