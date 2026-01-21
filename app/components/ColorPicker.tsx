import { useState, useCallback, useEffect } from "react";
import {
  Popover,
  ColorPicker as PolarisColorPicker,
  TextField,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Box,
  hsbToRgb,
  rgbToHsb,
  type HSBAColor,
} from "@shopify/polaris";

interface ColorPickerProps {
  label: string;
  value: string; // Hex color e.g. "#FF0000" or "#FF0000FF" with alpha
  onChange: (value: string) => void;
  allowAlpha?: boolean;
  error?: string;
  helpText?: string;
}

function hexToHsba(hex: string): HSBAColor {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Handle short hex
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Parse alpha if present
  let a = 1;
  if (hex.length === 8) {
    a = parseInt(hex.substring(6, 8), 16) / 255;
  }

  const hsb = rgbToHsb({ red: r * 255, green: g * 255, blue: b * 255 });

  return {
    hue: hsb.hue,
    saturation: hsb.saturation,
    brightness: hsb.brightness,
    alpha: a,
  };
}

function hsbaToHex(hsba: HSBAColor, includeAlpha: boolean = false): string {
  const rgb = hsbToRgb({
    hue: hsba.hue,
    saturation: hsba.saturation,
    brightness: hsba.brightness,
  });

  const toHex = (n: number) =>
    Math.round(n)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  let hex = `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;

  if (includeAlpha && hsba.alpha !== undefined) {
    hex += toHex(hsba.alpha * 255);
  }

  return hex;
}

function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex);
}

export function ColorPicker({
  label,
  value,
  onChange,
  allowAlpha = false,
  error,
  helpText,
}: ColorPickerProps) {
  const [popoverActive, setPopoverActive] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [color, setColor] = useState<HSBAColor>(() => hexToHsba(value));

  // Sync internal state when value prop changes
  useEffect(() => {
    if (isValidHex(value)) {
      setHexInput(value);
      setColor(hexToHsba(value));
    }
  }, [value]);

  const togglePopover = useCallback(() => {
    setPopoverActive((active) => !active);
  }, []);

  const handleColorChange = useCallback(
    (newColor: HSBAColor) => {
      setColor(newColor);
      const hex = hsbaToHex(newColor, allowAlpha);
      setHexInput(hex);
      onChange(hex);
    },
    [onChange, allowAlpha]
  );

  const handleHexInputChange = useCallback(
    (newValue: string) => {
      setHexInput(newValue);

      // Add # if not present
      let hex = newValue;
      if (!hex.startsWith("#") && hex.length > 0) {
        hex = "#" + hex;
      }

      if (isValidHex(hex)) {
        const hsba = hexToHsba(hex);
        setColor(hsba);
        onChange(hex.toUpperCase());
      }
    },
    [onChange]
  );

  const handleHexInputBlur = useCallback(() => {
    // Normalize hex on blur
    if (isValidHex(hexInput)) {
      let hex = hexInput.toUpperCase();
      if (!hex.startsWith("#")) {
        hex = "#" + hex;
      }
      setHexInput(hex);
      onChange(hex);
    } else {
      // Reset to last valid value
      setHexInput(value);
    }
  }, [hexInput, value, onChange]);

  const activator = (
    <button
      type="button"
      onClick={togglePopover}
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "var(--p-border-radius-200)",
        border: "1px solid var(--p-color-border)",
        cursor: "pointer",
        backgroundColor: value,
        backgroundImage:
          color.alpha !== undefined && color.alpha < 1
            ? `linear-gradient(45deg, #ccc 25%, transparent 25%),
               linear-gradient(-45deg, #ccc 25%, transparent 25%),
               linear-gradient(45deg, transparent 75%, #ccc 75%),
               linear-gradient(-45deg, transparent 75%, #ccc 75%)`
            : "none",
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: value,
        }}
      />
    </button>
  );

  // Preset colors
  const presetColors = [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FF6B35",
    "#F7C59F",
    "#2EC4B6",
    "#E71D36",
  ];

  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <InlineStack gap="200" blockAlign="center">
        <Popover
          active={popoverActive}
          activator={activator}
          onClose={togglePopover}
          preferredAlignment="left"
        >
          <Box padding="300">
            <BlockStack gap="300">
              <PolarisColorPicker
                onChange={handleColorChange}
                color={color}
                allowAlpha={allowAlpha}
              />
              <InlineStack gap="100" wrap>
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => {
                      const hsba = hexToHsba(presetColor);
                      handleColorChange({ ...hsba, alpha: color.alpha });
                    }}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "4px",
                      border:
                        value.toUpperCase() === presetColor
                          ? "2px solid var(--p-color-border-emphasis)"
                          : "1px solid var(--p-color-border)",
                      backgroundColor: presetColor,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title={presetColor}
                  />
                ))}
              </InlineStack>
            </BlockStack>
          </Box>
        </Popover>
        <div style={{ width: "100px" }}>
          <TextField
            label="Hex color"
            labelHidden
            value={hexInput}
            onChange={handleHexInputChange}
            onBlur={handleHexInputBlur}
            autoComplete="off"
            monospaced
            error={error ? true : false}
          />
        </div>
        {allowAlpha && color.alpha !== undefined && (
          <Text as="span" variant="bodySm" tone="subdued">
            {Math.round(color.alpha * 100)}%
          </Text>
        )}
      </InlineStack>
      {error && (
        <Text as="span" variant="bodySm" tone="critical">
          {error}
        </Text>
      )}
      {helpText && !error && (
        <Text as="span" variant="bodySm" tone="subdued">
          {helpText}
        </Text>
      )}
    </BlockStack>
  );
}
