import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  BlockStack,
  Text,
  InlineStack,
  Box,
  Divider,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

interface Settings {
  id: string;
  shop: string;
  defaultPosition: string;
  defaultBgColor: string;
  defaultTextColor: string;
  defaultAccentColor: string;
  fontFamily: string;
  fontSize: string;
  defaultPreText: string | null;
  defaultPostText: string | null;
  cookieDuration: number;
  respectDoNotTrack: boolean;
  enableAnalytics: boolean;
  enableABTesting: boolean;
  customCSS: string | null;
}

const TIMEZONE_OPTIONS = [
  { label: "UTC", value: "UTC" },
  { label: "America/New_York (EST/EDT)", value: "America/New_York" },
  { label: "America/Chicago (CST/CDT)", value: "America/Chicago" },
  { label: "America/Denver (MST/MDT)", value: "America/Denver" },
  { label: "America/Los_Angeles (PST/PDT)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT/BST)", value: "Europe/London" },
  { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
  { label: "Europe/Berlin (CET/CEST)", value: "Europe/Berlin" },
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "Australia/Sydney (AEST/AEDT)", value: "Australia/Sydney" },
];

const POSITION_OPTIONS = [
  { label: "Top", value: "TOP" },
  { label: "Bottom", value: "BOTTOM" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "Inherit from theme", value: "inherit" },
  { label: "System UI", value: "system-ui, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
];

const FONT_SIZE_OPTIONS = [
  { label: "12px (Small)", value: "12px" },
  { label: "14px (Default)", value: "14px" },
  { label: "16px (Medium)", value: "16px" },
  { label: "18px (Large)", value: "18px" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get or create settings for this shop
  let settings = await prisma.settings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { shop },
    });
  }

  return json({ settings, shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();

  try {
    const data = {
      defaultPosition: formData.get("defaultPosition") as string,
      defaultBgColor: formData.get("defaultBgColor") as string,
      defaultTextColor: formData.get("defaultTextColor") as string,
      defaultAccentColor: formData.get("defaultAccentColor") as string,
      fontFamily: formData.get("fontFamily") as string,
      fontSize: formData.get("fontSize") as string,
      defaultPreText: (formData.get("defaultPreText") as string) || null,
      defaultPostText: (formData.get("defaultPostText") as string) || null,
      cookieDuration: parseInt(formData.get("cookieDuration") as string) || 24,
      respectDoNotTrack: formData.get("respectDoNotTrack") === "true",
      enableAnalytics: formData.get("enableAnalytics") === "true",
      enableABTesting: formData.get("enableABTesting") === "true",
      customCSS: (formData.get("customCSS") as string) || null,
    };

    await prisma.settings.upsert({
      where: { shop },
      update: data,
      create: { shop, ...data },
    });

    return json({ success: true, message: "Settings saved successfully!" });
  } catch (error) {
    console.error("Error saving settings:", error);
    return json(
      { success: false, message: "Failed to save settings" },
      { status: 500 }
    );
  }
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form state
  const [formData, setFormData] = useState({
    defaultPosition: settings.defaultPosition,
    defaultBgColor: settings.defaultBgColor,
    defaultTextColor: settings.defaultTextColor,
    defaultAccentColor: settings.defaultAccentColor,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    defaultPreText: settings.defaultPreText || "",
    defaultPostText: settings.defaultPostText || "",
    cookieDuration: settings.cookieDuration.toString(),
    respectDoNotTrack: settings.respectDoNotTrack,
    enableAnalytics: settings.enableAnalytics,
    enableABTesting: settings.enableABTesting,
    customCSS: settings.customCSS || "",
  });

  // Toast state for success message
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
      const timeout = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [actionData]);

  const handleChange = useCallback((field: string) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Page title="Settings" backAction={{ content: "Home", url: "/app" }}>
      <Form method="post">
        <Layout>
          {showToast && actionData?.success && (
            <Layout.Section>
              <Banner tone="success" onDismiss={() => setShowToast(false)}>
                {actionData.message}
              </Banner>
            </Layout.Section>
          )}

          {actionData && !actionData.success && (
            <Layout.Section>
              <Banner tone="critical">
                {actionData.message}
              </Banner>
            </Layout.Section>
          )}

          {/* Default Styling */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Default Styling
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Set default colors and position for new timers. These can be overridden per timer.
                </Text>

                <FormLayout>
                  <Select
                    label="Default Position"
                    options={POSITION_OPTIONS}
                    value={formData.defaultPosition}
                    onChange={handleChange("defaultPosition")}
                    name="defaultPosition"
                  />

                  <FormLayout.Group>
                    <TextField
                      label="Background Color"
                      type="color"
                      value={formData.defaultBgColor}
                      onChange={handleChange("defaultBgColor")}
                      name="defaultBgColor"
                      autoComplete="off"
                    />
                    <TextField
                      label="Text Color"
                      type="color"
                      value={formData.defaultTextColor}
                      onChange={handleChange("defaultTextColor")}
                      name="defaultTextColor"
                      autoComplete="off"
                    />
                    <TextField
                      label="Accent Color"
                      type="color"
                      value={formData.defaultAccentColor}
                      onChange={handleChange("defaultAccentColor")}
                      name="defaultAccentColor"
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Typography */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Typography
                </Text>

                <FormLayout>
                  <FormLayout.Group>
                    <Select
                      label="Font Family"
                      options={FONT_FAMILY_OPTIONS}
                      value={formData.fontFamily}
                      onChange={handleChange("fontFamily")}
                      name="fontFamily"
                    />
                    <Select
                      label="Font Size"
                      options={FONT_SIZE_OPTIONS}
                      value={formData.fontSize}
                      onChange={handleChange("fontSize")}
                      name="fontSize"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Default Content */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Default Content
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Set default text that appears before and after the countdown.
                </Text>

                <FormLayout>
                  <TextField
                    label="Default Pre-Text"
                    value={formData.defaultPreText}
                    onChange={handleChange("defaultPreText")}
                    name="defaultPreText"
                    placeholder="e.g., Sale ends in"
                    autoComplete="off"
                  />
                  <TextField
                    label="Default Post-Text"
                    value={formData.defaultPostText}
                    onChange={handleChange("defaultPostText")}
                    name="defaultPostText"
                    placeholder="e.g., Shop now!"
                    autoComplete="off"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Behavior Settings */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Behavior Settings
                </Text>

                <FormLayout>
                  <TextField
                    label="Cookie Duration (hours)"
                    type="number"
                    value={formData.cookieDuration}
                    onChange={handleChange("cookieDuration")}
                    name="cookieDuration"
                    helpText="How long to remember when a visitor closes a timer"
                    autoComplete="off"
                    min={1}
                    max={720}
                  />

                  <Checkbox
                    label="Respect Do Not Track"
                    checked={formData.respectDoNotTrack}
                    onChange={handleChange("respectDoNotTrack")}
                    helpText="Don't track impressions/clicks for visitors with DNT enabled"
                  />
                  <input
                    type="hidden"
                    name="respectDoNotTrack"
                    value={formData.respectDoNotTrack.toString()}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Analytics */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Analytics
                </Text>

                <FormLayout>
                  <Checkbox
                    label="Enable Analytics"
                    checked={formData.enableAnalytics}
                    onChange={handleChange("enableAnalytics")}
                    helpText="Track timer impressions and click-through rates"
                  />
                  <input
                    type="hidden"
                    name="enableAnalytics"
                    value={formData.enableAnalytics.toString()}
                  />

                  <Checkbox
                    label="Enable A/B Testing"
                    checked={formData.enableABTesting}
                    onChange={handleChange("enableABTesting")}
                    helpText="Run experiments to compare timer variations (coming soon)"
                    disabled
                  />
                  <input
                    type="hidden"
                    name="enableABTesting"
                    value={formData.enableABTesting.toString()}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Custom CSS */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Custom CSS
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Add custom CSS to further customize timer appearance.
                </Text>

                <TextField
                  label="Custom CSS"
                  value={formData.customCSS}
                  onChange={handleChange("customCSS")}
                  name="customCSS"
                  multiline={6}
                  placeholder={`.countdown-timer-bar {\n  /* Your custom styles */\n}`}
                  autoComplete="off"
                  monospaced
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Save Button */}
          <Layout.Section>
            <InlineStack align="end">
              <Button variant="primary" submit loading={isSubmitting}>
                Save Settings
              </Button>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </Form>
    </Page>
  );
}

// Error Boundary
export function ErrorBoundary() {
  const error = useRouteError();

  let message = "Something went wrong loading settings";

  if (isRouteErrorResponse(error)) {
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Page title="Settings Error" backAction={{ content: "Home", url: "/app" }}>
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
                <Button variant="plain" url="/app">
                  Back to Dashboard
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
