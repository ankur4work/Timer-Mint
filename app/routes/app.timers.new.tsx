import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation, Form, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Button,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "~/shopify.server";
import { createTimer, validateTimerData } from "~/utils/timer.server";
import { syncTimersToMetafield } from "~/utils/sync.server";
import { TimerForm, getDefaultTimerFormData, type TimerFormData } from "~/components/TimerForm";
import { TimerPreview, type TimerPreviewData } from "~/components/TimerPreview";

interface ActionData {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
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

    await createTimer(shop, validation.data);

    // Sync timers to metafield for storefront access
    await syncTimersToMetafield(admin, shop);

    return redirect("/app/timers?created=true");
  } catch (error) {
    console.error("Error creating timer:", error);
    return json<ActionData>(
      {
        success: false,
        errors: {},
        message: error instanceof Error ? error.message : "Failed to create timer",
      },
      { status: 500 }
    );
  }
};

export default function NewTimer() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState<TimerFormData>(getDefaultTimerFormData());

  const handleFormChange = useCallback((newData: TimerFormData) => {
    setFormData(newData);
  }, []);

  const handleSubmit = useCallback(() => {
    const form = new FormData();
    form.set("data", JSON.stringify(formData));
    submit(form, { method: "post" });
  }, [formData, submit]);

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
      title="Create Timer"
      backAction={{ content: "Timers", url: "/app/timers" }}
    >
      <Layout>
        {actionData?.message && !actionData?.success && (
          <Layout.Section>
            <Banner tone="critical">{actionData.message}</Banner>
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
              Create Timer
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
