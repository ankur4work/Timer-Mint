import { BlockStack, InlineStack, Text, Box } from "@shopify/polaris";

interface ColorInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ColorInput({ label, name, value, onChange, error }: ColorInputProps) {
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <InlineStack gap="200" align="start" blockAlign="center">
        <input
          type="color"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "40px",
            height: "40px",
            padding: 0,
            border: "1px solid var(--p-color-border)",
            borderRadius: "var(--p-border-radius-200)",
            cursor: "pointer",
          }}
        />
        <Text as="span" variant="bodyMd" tone="subdued">
          {value}
        </Text>
      </InlineStack>
      {error && (
        <Text as="span" variant="bodySm" tone="critical">
          {error}
        </Text>
      )}
    </BlockStack>
  );
}
