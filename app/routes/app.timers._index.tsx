import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  useIndexResourceState,
  IndexFilters,
  useSetIndexFiltersMode,
  ChoiceList,
  EmptyState,
  type IndexFiltersProps,
  type TabProps,
  Button,
  BlockStack,
  Box,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "~/shopify.server";
import {
  getTimers,
  deleteTimers,
  updateTimersStatus,
} from "~/utils/timer.server";
import { syncTimersToMetafield } from "~/utils/sync.server";
import { formatTimerDate } from "~/utils/format";

// Serialized timer type (dates are strings after JSON serialization)
interface SerializedTimer {
  id: string;
  shop: string;
  name: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string;
  timezone: string;
  evergreenDuration: number | null;
  evergreenResetDelay: number | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  position: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  preText: string | null;
  postText: string | null;
  linkUrl: string | null;
  linkText: string | null;
  showOnAllPages: boolean;
  targetPages: string | null;
  excludePages: string | null;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  showLabels: boolean;
  closeButton: boolean;
  stickyOnScroll: boolean;
  animation: string | null;
  createdAt: string;
  updatedAt: string;
  settingsId: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const timers = await getTimers(shop, { status, type, search });

  return json({ timers, shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const ids = formData.getAll("ids") as string[];

  try {
    switch (intent) {
      case "delete":
        await deleteTimers(ids, shop);
        // Sync timers to metafield for storefront access
        await syncTimersToMetafield(admin, shop);
        return json({ success: true, message: `${ids.length} timer(s) deleted` });

      case "activate":
        await updateTimersStatus(ids, shop, "ACTIVE");
        // Sync timers to metafield for storefront access
        await syncTimersToMetafield(admin, shop);
        return json({ success: true, message: `${ids.length} timer(s) activated` });

      case "pause":
        await updateTimersStatus(ids, shop, "INACTIVE");
        // Sync timers to metafield for storefront access
        await syncTimersToMetafield(admin, shop);
        return json({ success: true, message: `${ids.length} timer(s) paused` });

      default:
        return json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json(
      { success: false, message: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
};

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
  switch (type) {
    case "COUNTDOWN":
      return <Badge>Countdown</Badge>;
    case "EVERGREEN":
      return <Badge tone="attention">Evergreen</Badge>;
    case "DAILY":
      return <Badge tone="info">Daily</Badge>;
    default:
      return <Badge>{type}</Badge>;
  }
}

export default function TimersIndex() {
  const { timers } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  // Index filters state
  const [queryValue, setQueryValue] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string[]>(
    searchParams.get("status") ? [searchParams.get("status")!] : []
  );
  const [typeFilter, setTypeFilter] = useState<string[]>(
    searchParams.get("type") ? [searchParams.get("type")!] : []
  );

  const { mode, setMode } = useSetIndexFiltersMode();

  // Tab handling
  const [selected, setSelected] = useState(0);
  const tabs: TabProps[] = [
    { id: "all", content: "All", accessibilityLabel: "All timers" },
    { id: "active", content: "Active", accessibilityLabel: "Active timers" },
    { id: "inactive", content: "Paused", accessibilityLabel: "Paused timers" },
  ];

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelected(selectedTabIndex);
    const tab = tabs[selectedTabIndex];
    const params = new URLSearchParams(searchParams);

    if (tab.id === "all") {
      params.delete("status");
    } else if (tab.id === "active") {
      params.set("status", "ACTIVE");
    } else if (tab.id === "inactive") {
      params.set("status", "INACTIVE");
    }

    setSearchParams(params);
    setStatusFilter(tab.id === "all" ? [] : [tab.id.toUpperCase()]);
  }, [searchParams, setSearchParams, tabs]);

  // Filter handlers
  const handleStatusFilterChange = useCallback((value: string[]) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value.length > 0) {
      params.set("status", value[0]);
    } else {
      params.delete("status");
    }
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleTypeFilterChange = useCallback((value: string[]) => {
    setTypeFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value.length > 0) {
      params.set("type", value[0]);
    } else {
      params.delete("type");
    }
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleQueryChange = useCallback((value: string) => {
    setQueryValue(value);
  }, []);

  const handleQueryClear = useCallback(() => {
    setQueryValue("");
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleFiltersClearAll = useCallback(() => {
    setStatusFilter([]);
    setTypeFilter([]);
    setQueryValue("");
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (queryValue) {
        params.set("search", queryValue);
      } else {
        params.delete("search");
      }
      setSearchParams(params);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [queryValue]);

  // Filters configuration
  const filters: IndexFiltersProps["filters"] = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Active", value: "ACTIVE" },
            { label: "Paused", value: "INACTIVE" },
            { label: "Scheduled", value: "SCHEDULED" },
          ]}
          selected={statusFilter}
          onChange={handleStatusFilterChange}
        />
      ),
      shortcut: true,
    },
    {
      key: "type",
      label: "Type",
      filter: (
        <ChoiceList
          title="Type"
          titleHidden
          choices={[
            { label: "Countdown", value: "COUNTDOWN" },
            { label: "Evergreen", value: "EVERGREEN" },
            { label: "Daily", value: "DAILY" },
          ]}
          selected={typeFilter}
          onChange={handleTypeFilterChange}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters: IndexFiltersProps["appliedFilters"] = [];
  if (statusFilter.length > 0) {
    appliedFilters.push({
      key: "status",
      label: `Status: ${statusFilter[0]}`,
      onRemove: () => handleStatusFilterChange([]),
    });
  }
  if (typeFilter.length > 0) {
    appliedFilters.push({
      key: "type",
      label: `Type: ${typeFilter[0]}`,
      onRemove: () => handleTypeFilterChange([]),
    });
  }

  // Index table resource selection
  const resourceName = {
    singular: "timer",
    plural: "timers",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(timers as unknown as { id: string }[]);

  // Bulk actions
  const handleBulkAction = (intent: string) => {
    const formData = new FormData();
    formData.set("intent", intent);
    selectedResources.forEach((id) => formData.append("ids", id));
    submit(formData, { method: "post" });
  };

  const promotedBulkActions = [
    {
      content: "Activate",
      onAction: () => handleBulkAction("activate"),
    },
    {
      content: "Pause",
      onAction: () => handleBulkAction("pause"),
    },
  ];

  const bulkActions = [
    {
      content: "Delete",
      onAction: () => handleBulkAction("delete"),
      destructive: true,
    },
  ];

  // Table row markup
  const rowMarkup = (timers as unknown as SerializedTimer[]).map(
    (timer, index) => (
      <IndexTable.Row
        id={timer.id}
        key={timer.id}
        selected={selectedResources.includes(timer.id)}
        position={index}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            <Button variant="plain" url={`/app/timers/${timer.id}`}>
              {timer.name}
            </Button>
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{getTypeBadge(timer.type)}</IndexTable.Cell>
        <IndexTable.Cell>{getStatusBadge(timer.status)}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {timer.startDate ? formatTimerDate(timer.startDate) : "—"}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {formatTimerDate(timer.endDate)}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  // Empty state
  if (timers.length === 0 && !queryValue && statusFilter.length === 0 && typeFilter.length === 0) {
    return (
      <Page
        title="Timers"
        primaryAction={{
          content: "Create timer",
          url: "/app/timers/new",
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Create your first countdown timer"
                action={{
                  content: "Create timer",
                  url: "/app/timers/new",
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Add countdown timers to your store to create urgency and boost
                  conversions. Choose from countdown, evergreen, or daily timer types.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Timers"
      primaryAction={{
        content: "Create timer",
        url: "/app/timers/new",
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexFilters
              queryValue={queryValue}
              queryPlaceholder="Search timers..."
              onQueryChange={handleQueryChange}
              onQueryClear={handleQueryClear}
              tabs={tabs}
              selected={selected}
              onSelect={handleTabChange}
              filters={filters}
              appliedFilters={appliedFilters}
              onClearAll={handleFiltersClearAll}
              mode={mode}
              setMode={setMode}
              loading={isLoading}
            />
            <IndexTable
              resourceName={resourceName}
              itemCount={timers.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Name" },
                { title: "Type" },
                { title: "Status" },
                { title: "Start Date" },
                { title: "End Date" },
              ]}
              promotedBulkActions={promotedBulkActions}
              bulkActions={bulkActions}
            >
              {rowMarkup}
            </IndexTable>
            {timers.length === 0 && (
              <Box padding="400">
                <BlockStack gap="200" align="center">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No timers found matching your filters.
                  </Text>
                  <Button onClick={handleFiltersClearAll}>Clear filters</Button>
                </BlockStack>
              </Box>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
