import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Button,
  Banner,
  InlineStack,
  Modal,
  Text,
  Card,
  BlockStack,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "~/shopify.server";
import {
  getTimer,
  updateTimer,
  deleteTimer,
  validateTimerData,
} from "~/utils/timer.server";
import { syncTimersToMetafield } from "~/utils/sync.server";
import { formatDateForInput } from "~/utils/format";
import { TimerForm, type TimerFormData } from "~/components/TimerForm";
import { TimerPreview, type TimerPreviewData } from "~/components/TimerPreview";

interface ActionData {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  if (!id) {
    throw new Response("Timer ID required", { status: 400 });
  }

  const timer = await getTimer(id, shop);

  if (!timer) {
    throw new Response("Timer not found", { status: 404 });
  }

  return json({ timer });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  if (!id) {
    return json<ActionData>({ success: false, message: "Timer ID required" }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle delete
  if (intent === "delete") {
    try {
      await deleteTimer(id, shop);

      // Sync timers to metafield for storefront access
      await syncTimersToMetafield(admin, shop);

      return redirect("/app/timers?deleted=true");
    } catch (error) {
      return json<ActionData>(
        {
          success: false,
          errors: {},
          message: error instanceof Error ? error.message : "Failed to delete timer",
        },
        { status: 500 }
      );
    }
  }

  // Handle update
  const rawData = formData.get("data");

  if (!rawData || typeof rawData !== "string") {
    return json<ActionData>(
      { success: false, errors: {}, message: "Invalid form data" },
      { status: 400 }
    );
  }

  try {
    const data = JSON.parse(rawData);

    // Process data for validation
    const processedData: Record<string, unknown> = {
      ...data,
      // Convert empty strings to null for optional fields
      startDate: data.startDate || null,
      evergreenDuration: data.evergreenDuration ? parseInt(data.evergreenDuration) : null,
      evergreenResetDelay: data.evergreenResetDelay ? parseInt(data.evergreenResetDelay) : null,
      dailyStartTime: data.dailyStartTime || null,
      dailyEndTime: data.dailyEndTime || null,
      preText: data.preText || null,
      postText: data.postText || null,
      linkUrl: data.ctaUrl || null,
      linkText: data.ctaText || null,
      animation: data.animation || null,
      targetPages: data.targetPages || null,
      excludePages: data.excludePages || null,
    };

    // Validate data
    const validation = validateTimerData(processedData);

    if (!validation.success) {
      return json<ActionData>(
        {
          success: false,
          errors: validation.error.flatten().fieldErrors,
          message: "Please fix the validation errors",
        },
        { status: 400 }
      );
    }

    await updateTimer(id, shop, validation.data);

    // Sync timers to metafield for storefront access
    await syncTimersToMetafield(admin, shop);

    return json<ActionData>({ success: true, message: "Timer updated successfully" });
  } catch (error) {
    console.error("Error updating timer:", error);
    return json<ActionData>(
      {
        success: false,
        errors: {},
        message: error instanceof Error ? error.message : "Failed to update timer",
      },
      { status: 500 }
    );
  }
};

// Convert timer from database to form data format
function timerToFormData(timer: any): TimerFormData {
  return {
    name: timer.name || "",
    type: timer.type || "COUNTDOWN",
    status: timer.status || "INACTIVE",
    startDate: timer.startDate ? formatDateForInput(timer.startDate) : "",
    endDate: timer.endDate ? formatDateForInput(timer.endDate) : "",
    timezone: timer.timezone || "UTC",
    evergreenDuration: timer.evergreenDuration?.toString() || "",
    evergreenResetDelay: timer.evergreenResetDelay?.toString() || "",
    dailyStartTime: timer.dailyStartTime || "",
    dailyEndTime: timer.dailyEndTime || "",
    preText: timer.preText || "",
    postText: timer.postText || "",
    expiredText: "Offer expired!",
    ctaText: timer.linkText || "",
    ctaUrl: timer.linkUrl || "",
    position: timer.position || "TOP",
    backgroundColor: timer.backgroundColor || "#000000",
    textColor: timer.textColor || "#FFFFFF",
    accentColor: timer.accentColor || "#FF0000",
    fontFamily: "inherit",
    fontSize: "14px",
    animation: timer.animation || "",
    showDays: timer.showDays ?? true,
    showHours: timer.showHours ?? true,
    showMinutes: timer.showMinutes ?? true,
    showSeconds: timer.showSeconds ?? true,
    showLabels: timer.showLabels ?? true,
    closeButton: timer.closeButton ?? true,
    stickyOnScroll: timer.stickyOnScroll ?? true,
    showOnAllPages: timer.showOnAllPages ?? true,
    targetPages: timer.targetPages || "",
    excludePages: timer.excludePages || "",
    deviceTarget: "all",
    priority: "5",
  };
}

export default function EditTimer() {
  const { timer } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<TimerFormData>(() => timerToFormData(timer));

  const handleFormChange = useCallback((newData: TimerFormData) => {
    setFormData(newData);
  }, []);

  const handleSubmit = useCallback(() => {
    const form = new FormData();
    form.set("data", JSON.stringify(formData));
    submit(form, { method: "post" });
  }, [formData, submit]);

  const handleDelete = useCallback(() => {
    const form = new FormData();
    form.set("intent", "delete");
    submit(form, { method: "post" });
  }, [submit]);

  // Convert form data to preview data
  const previewData: TimerPreviewData = {
    name: formData.name,
    type: formData.type,
    endDate: formData.endDate,
    startDate: formData.startDate,
    position: formData.position,
    backgroundColor: formData.backgroundColor,
    textColor: formData.textColor,
    accentColor: formData.accentColor,
    preText: formData.preText,
    postText: formData.postText,
    expiredText: formData.expiredText,
    ctaText: formData.ctaText,
    ctaUrl: formData.ctaUrl,
    showDays: formData.showDays,
    showHours: formData.showHours,
    showMinutes: formData.showMinutes,
    showSeconds: formData.showSeconds,
    showLabels: formData.showLabels,
    closeButton: formData.closeButton,
    fontFamily: formData.fontFamily,
    fontSize: formData.fontSize,
    animation: formData.animation,
    evergreenDuration: formData.evergreenDuration ? parseInt(formData.evergreenDuration) : undefined,
  };

  return (
    <Page
      title={`Edit: ${timer.name}`}
      backAction={{ content: "Timers", url: "/app/timers" }}
      secondaryActions={[
        {
          content: "Delete",
          destructive: true,
          onAction: () => setDeleteModalOpen(true),
        },
      ]}
    >
      <Layout>
        {actionData?.message && (
          <Layout.Section>
            <Banner tone={actionData.success ? "success" : "critical"}>
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <TimerForm
            data={formData}
            onChange={handleFormChange}
            errors={actionData?.errors}
            isSubmitting={isSubmitting}
          />
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <TimerPreview data={previewData} />
        </Layout.Section>

        <Layout.Section>
          <InlineStack align="end" gap="300">
            <Button url="/app/timers">Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              Save Changes
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete timer?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDelete,
          loading: isSubmitting,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete "{timer.name}"? This action cannot be
            undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

// Error Boundary
export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Error";
  let message = "Something went wrong";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Timer Not Found";
      message = "The timer you're looking for doesn't exist or has been deleted.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Page title={title} backAction={{ content: "Timers", url: "/app/timers" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Banner tone="critical">
                <Text as="p" variant="bodyMd">
                  {message}
                </Text>
              </Banner>
              <InlineStack gap="300">
                <Button onClick={() => window.location.reload()}>
                  Try again
                </Button>
                <Button variant="plain" url="/app/timers">
                  Back to Timers
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
