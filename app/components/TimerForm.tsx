import { useCallback } from "react";
import {
  Card,
  BlockStack,
  InlineGrid,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Text,
  Banner,
  Divider,
  InlineStack,
  ChoiceList,
} from "@shopify/polaris";
import { ColorPicker } from "./ColorPicker";
import { DateTimePicker } from "./DateTimePicker";

export interface TimerFormData {
  // Basic
  name: string;
  type: string;
  status: string;

  // Timing
  startDate: string;
  endDate: string;
  timezone: string;
  evergreenDuration: string;
  evergreenResetDelay: string;
  dailyStartTime: string;
  dailyEndTime: string;

  // Content
  preText: string;
  postText: string;
  expiredText: string;
  ctaText: string;
  ctaUrl: string;

  // Styling
  position: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  animation: string;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  showLabels: boolean;
  closeButton: boolean;
  stickyOnScroll: boolean;

  // Targeting
  showOnAllPages: boolean;
  targetPages: string;
  excludePages: string;
  deviceTarget: string;
  priority: string;
}

interface TimerFormProps {
  data: TimerFormData;
  onChange: (data: TimerFormData) => void;
  errors?: Record<string, string[]>;
  isSubmitting?: boolean;
}

export function TimerForm({
  data,
  onChange,
  errors = {},
}: TimerFormProps) {
  const handleStringChange = useCallback(
    (field: keyof TimerFormData) => (value: string) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const handleBooleanChange = useCallback(
    (field: keyof TimerFormData) => (value: boolean) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const getFieldError = (field: string): string | undefined => {
    return errors[field]?.[0];
  };

  const handleStatusChange = useCallback((selected: string[]) => {
    const status = selected[0];
    onChange({ ...data, status, startDate: "" });
  }, [data, onChange]);

  // Validate basic requirements
  const hasErrors: string[] = [];
  if (!data.name.trim()) {
    hasErrors.push("Timer name is required");
  }
  if (!data.endDate) {
    hasErrors.push("End date is required");
  }

  const positionOptions = [
    { label: "Top Bar (full width)", value: "TOP" },
    { label: "Bottom Bar (full width)", value: "BOTTOM" },
    { label: "Floating Top", value: "FLOATING_TOP" },
    { label: "Floating Bottom", value: "FLOATING_BOTTOM" },
    { label: "Top Left Corner", value: "TOP_LEFT" },
    { label: "Top Right Corner", value: "TOP_RIGHT" },
    { label: "Bottom Left Corner", value: "BOTTOM_LEFT" },
    { label: "Bottom Right Corner", value: "BOTTOM_RIGHT" },
    { label: "Left Side (Vertical)", value: "LEFT_VERTICAL" },
    { label: "Right Side (Vertical)", value: "RIGHT_VERTICAL" },
  ];

  const fontSizeOptions = [
    { label: "Small", value: "12px" },
    { label: "Medium", value: "14px" },
    { label: "Large", value: "16px" },
    { label: "Extra Large", value: "18px" },
  ];

  return (
    <BlockStack gap="400">
      {hasErrors.length > 0 && (
        <Banner tone="warning">
          <BlockStack gap="100">
            {hasErrors.map((error, i) => (
              <Text key={i} as="p" variant="bodySm">
                {error}
              </Text>
            ))}
          </BlockStack>
        </Banner>
      )}

      {/* Timer Settings */}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Timer Settings
          </Text>

          <FormLayout>
            <TextField
              label="Timer Name"
              value={data.name}
              onChange={handleStringChange("name")}
              autoComplete="off"
              error={getFieldError("name")}
              helpText="Internal name (only visible to you)"
              maxLength={100}
            />

            <Divider />

            <Text as="h3" variant="headingSm">
              Timer Status
            </Text>

            <ChoiceList
              title=""
              titleHidden
              choices={[
                {
                  label: "Active",
                  value: "ACTIVE",
                  helpText: "Timer will show on your store",
                },
                {
                  label: "Inactive",
                  value: "INACTIVE",
                  helpText: "Timer won't show on your store (draft mode)",
                },
              ]}
              selected={[data.status]}
              onChange={handleStatusChange}
            />

            <Divider />

            <Text as="h3" variant="headingSm">
              Countdown End Date
            </Text>
            <DateTimePicker
              label="End Date & Time"
              value={data.endDate}
              onChange={handleStringChange("endDate")}
              timezone={data.timezone}
              onTimezoneChange={handleStringChange("timezone")}
              error={getFieldError("endDate")}
              helpText="When should the countdown end?"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Message & Button */}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Message & Button
          </Text>

          <FormLayout>
            <TextField
              label="Text Before Timer"
              value={data.preText}
              onChange={handleStringChange("preText")}
              autoComplete="off"
              placeholder="🔥 Sale ends in"
              helpText="Shown before the countdown"
              maxLength={100}
            />

            <TextField
              label="Text After Timer"
              value={data.postText}
              onChange={handleStringChange("postText")}
              autoComplete="off"
              placeholder="Don't miss out!"
              helpText="Shown after the countdown"
              maxLength={100}
            />

            <Divider />

            <InlineGrid columns={2} gap="400">
              <TextField
                label="Button Text (optional)"
                value={data.ctaText}
                onChange={handleStringChange("ctaText")}
                autoComplete="off"
                placeholder="Shop Now"
              />
              <TextField
                label="Button Link"
                value={data.ctaUrl}
                onChange={handleStringChange("ctaUrl")}
                autoComplete="off"
                placeholder="/collections/sale"
                helpText="Can be a full URL or path"
                error={getFieldError("ctaUrl")}
              />
            </InlineGrid>
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Appearance */}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Appearance
          </Text>

          <FormLayout>
            <InlineGrid columns={2} gap="400">
              <Select
                label="Position"
                options={positionOptions}
                value={data.position}
                onChange={handleStringChange("position")}
              />
              <Select
                label="Font Size"
                options={fontSizeOptions}
                value={data.fontSize}
                onChange={handleStringChange("fontSize")}
              />
            </InlineGrid>

            <Divider />

            <Text as="h3" variant="headingSm">
              Colors
            </Text>
            <InlineGrid columns={3} gap="400">
              <ColorPicker
                label="Background"
                value={data.backgroundColor}
                onChange={handleStringChange("backgroundColor")}
                error={getFieldError("backgroundColor")}
              />
              <ColorPicker
                label="Text"
                value={data.textColor}
                onChange={handleStringChange("textColor")}
                error={getFieldError("textColor")}
              />
              <ColorPicker
                label="Numbers"
                value={data.accentColor}
                onChange={handleStringChange("accentColor")}
                error={getFieldError("accentColor")}
              />
            </InlineGrid>

            <Divider />

            <Text as="h3" variant="headingSm">
              What to Display
            </Text>
            <InlineStack gap="400" wrap>
              <Checkbox
                label="Days"
                checked={data.showDays}
                onChange={handleBooleanChange("showDays")}
              />
              <Checkbox
                label="Hours"
                checked={data.showHours}
                onChange={handleBooleanChange("showHours")}
              />
              <Checkbox
                label="Minutes"
                checked={data.showMinutes}
                onChange={handleBooleanChange("showMinutes")}
              />
              <Checkbox
                label="Seconds"
                checked={data.showSeconds}
                onChange={handleBooleanChange("showSeconds")}
              />
            </InlineStack>
            <InlineStack gap="400" wrap>
              <Checkbox
                label="Show labels (Days, Hrs, etc.)"
                checked={data.showLabels}
                onChange={handleBooleanChange("showLabels")}
              />
              <Checkbox
                label="Show close button"
                checked={data.closeButton}
                onChange={handleBooleanChange("closeButton")}
              />
            </InlineStack>
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

// Default form data
export function getDefaultTimerFormData(): TimerFormData {
  return {
    name: "",
    type: "COUNTDOWN",
    status: "INACTIVE",
    startDate: "",
    endDate: "",
    timezone: "UTC",
    evergreenDuration: "",
    evergreenResetDelay: "",
    dailyStartTime: "",
    dailyEndTime: "",
    preText: "",
    postText: "",
    expiredText: "Offer expired!",
    ctaText: "",
    ctaUrl: "",
    position: "TOP",
    backgroundColor: "#1a1a2e",
    textColor: "#ffffff",
    accentColor: "#eab308",
    fontFamily: "inherit",
    fontSize: "14px",
    animation: "",
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    showLabels: true,
    closeButton: true,
    stickyOnScroll: true,
    showOnAllPages: true,
    targetPages: "",
    excludePages: "",
    deviceTarget: "all",
    priority: "5",
  };
}
