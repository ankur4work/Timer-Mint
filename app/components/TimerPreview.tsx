import { useState, useEffect, useCallback } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Box,
  ButtonGroup,
} from "@shopify/polaris";
import { DesktopIcon, MobileIcon } from "@shopify/polaris-icons";

export interface TimerPreviewData {
  name?: string;
  type?: string;
  endDate?: string;
  startDate?: string;
  position?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  preText?: string;
  postText?: string;
  expiredText?: string;
  ctaText?: string;
  ctaUrl?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  showLabels?: boolean;
  closeButton?: boolean;
  fontFamily?: string;
  fontSize?: string;
  animation?: string;
  // Evergreen specific
  evergreenDuration?: number;
}

interface TimerPreviewProps {
  data: TimerPreviewData;
  showDeviceToggle?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeRemaining(endDate: string | undefined): TimeRemaining {
  if (!endDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
  }

  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

// For evergreen timers, calculate based on duration
function calculateEvergreenTime(durationMinutes: number | undefined): TimeRemaining {
  if (!durationMinutes || durationMinutes <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
  }

  const totalSeconds = durationMinutes * 60;
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

export function TimerPreview({
  data,
  showDeviceToggle = true,
}: TimerPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => {
    if (data.type === "EVERGREEN") {
      return calculateEvergreenTime(data.evergreenDuration);
    }
    return calculateTimeRemaining(data.endDate);
  });
  const [isVisible, setIsVisible] = useState(true);

  // Update countdown every second
  useEffect(() => {
    if (data.type === "EVERGREEN") {
      // For evergreen, show static preview
      setTimeRemaining(calculateEvergreenTime(data.evergreenDuration));
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(data.endDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [data.endDate, data.type, data.evergreenDuration]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Reset after a moment for preview purposes
    setTimeout(() => setIsVisible(true), 1000);
  }, []);

  const {
    position = "TOP",
    backgroundColor = "#000000",
    textColor = "#FFFFFF",
    accentColor = "#FF0000",
    preText = "",
    postText = "",
    expiredText = "Offer expired!",
    ctaText = "",
    ctaUrl = "",
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    showLabels = true,
    closeButton = true,
    fontFamily = "inherit",
    fontSize = "14px",
    animation = "",
  } = data;

  const isMobile = viewMode === "mobile";
  const containerWidth = isMobile ? "375px" : "100%";

  // Animation styles
  const getAnimationStyle = () => {
    switch (animation) {
      case "pulse":
        return { animation: "pulse 2s infinite" };
      case "bounce":
        return { animation: "bounce 1s infinite" };
      case "fade":
        return { opacity: 0.9 };
      default:
        return {};
    }
  };

  const TimerDigit = ({
    value,
    label,
    show,
  }: {
    value: number;
    label: string;
    show: boolean;
  }) => {
    if (!show) return null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: isMobile ? "4px 8px" : "8px 12px",
        }}
      >
        <span
          style={{
            fontSize: isMobile ? "20px" : "28px",
            fontWeight: "bold",
            color: accentColor,
            fontFamily: "monospace",
            lineHeight: 1,
          }}
        >
          {value.toString().padStart(2, "0")}
        </span>
        {showLabels && (
          <span
            style={{
              fontSize: isMobile ? "10px" : "11px",
              textTransform: "uppercase",
              color: textColor,
              opacity: 0.8,
              marginTop: "4px",
            }}
          >
            {label}
          </span>
        )}
      </div>
    );
  };

  const Separator = () => (
    <span
      style={{
        fontSize: isMobile ? "18px" : "24px",
        fontWeight: "bold",
        color: textColor,
        opacity: 0.5,
        alignSelf: "flex-start",
        marginTop: isMobile ? "4px" : "8px",
      }}
    >
      :
    </span>
  );

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            Preview
          </Text>
          {showDeviceToggle && (
            <ButtonGroup variant="segmented">
              <Button
                pressed={viewMode === "desktop"}
                onClick={() => setViewMode("desktop")}
                icon={DesktopIcon}
                accessibilityLabel="Desktop view"
              />
              <Button
                pressed={viewMode === "mobile"}
                onClick={() => setViewMode("mobile")}
                icon={MobileIcon}
                accessibilityLabel="Mobile view"
              />
            </ButtonGroup>
          )}
        </InlineStack>

        {/* Preview Container */}
        <div
          style={{
            border: "1px solid var(--p-color-border)",
            borderRadius: "var(--p-border-radius-200)",
            overflow: "hidden",
            backgroundColor: "#f6f6f7",
            width: containerWidth,
            margin: "0 auto",
            transition: "width 0.3s ease",
          }}
        >
          {/* Simulated browser chrome */}
          <div
            style={{
              backgroundColor: "#e4e5e7",
              padding: "8px 12px",
              borderBottom: "1px solid var(--p-color-border)",
              display: "flex",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#ff5f57",
              }}
            />
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#ffbd2e",
              }}
            />
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#28c840",
              }}
            />
          </div>

          {/* Timer Bar */}
          {isVisible && (
            <div
              style={{
                backgroundColor,
                color: textColor,
                padding: isMobile ? "10px 12px" : "12px 20px",
                fontFamily,
                fontSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? "8px" : "16px",
                flexWrap: "wrap",
                position: "relative",
                ...getAnimationStyle(),
              }}
            >
              {/* Pre-text */}
              {preText && (
                <span style={{ fontWeight: 500 }}>{preText}</span>
              )}

              {/* Countdown or Expired Message */}
              {timeRemaining.expired ? (
                <span style={{ fontWeight: "bold", color: accentColor }}>
                  {expiredText}
                </span>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <TimerDigit
                    value={timeRemaining.days}
                    label="Days"
                    show={showDays}
                  />
                  {showDays && (showHours || showMinutes || showSeconds) && (
                    <Separator />
                  )}
                  <TimerDigit
                    value={timeRemaining.hours}
                    label="Hours"
                    show={showHours}
                  />
                  {showHours && (showMinutes || showSeconds) && <Separator />}
                  <TimerDigit
                    value={timeRemaining.minutes}
                    label="Mins"
                    show={showMinutes}
                  />
                  {showMinutes && showSeconds && <Separator />}
                  <TimerDigit
                    value={timeRemaining.seconds}
                    label="Secs"
                    show={showSeconds}
                  />
                </div>
              )}

              {/* Post-text */}
              {postText && !timeRemaining.expired && (
                <span style={{ fontWeight: 500 }}>{postText}</span>
              )}

              {/* CTA Button */}
              {ctaText && ctaUrl && (
                <button
                  type="button"
                  style={{
                    backgroundColor: accentColor,
                    color: "#fff",
                    border: "none",
                    padding: isMobile ? "6px 12px" : "8px 16px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: isMobile ? "12px" : "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ctaText}
                </button>
              )}

              {/* Close Button */}
              {closeButton && (
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: textColor,
                    cursor: "pointer",
                    fontSize: "18px",
                    opacity: 0.7,
                    padding: "4px",
                    lineHeight: 1,
                  }}
                  title="Close"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Simulated page content */}
          <div
            style={{
              padding: "20px",
              backgroundColor: "#fff",
              minHeight: "150px",
            }}
          >
            <div
              style={{
                height: "20px",
                backgroundColor: "#e4e5e7",
                borderRadius: "4px",
                marginBottom: "12px",
                width: "60%",
              }}
            />
            <div
              style={{
                height: "12px",
                backgroundColor: "#e4e5e7",
                borderRadius: "4px",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                height: "12px",
                backgroundColor: "#e4e5e7",
                borderRadius: "4px",
                marginBottom: "8px",
                width: "80%",
              }}
            />
            <div
              style={{
                height: "12px",
                backgroundColor: "#e4e5e7",
                borderRadius: "4px",
                width: "70%",
              }}
            />
          </div>
        </div>

        {/* Status Info */}
        <InlineStack gap="200">
          <Text as="span" variant="bodySm" tone="subdued">
            Position: {position}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            •
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {viewMode === "desktop" ? "Desktop" : "Mobile"} view
          </Text>
          {!data.endDate && data.type !== "EVERGREEN" && (
            <>
              <Text as="span" variant="bodySm" tone="subdued">
                •
              </Text>
              <Text as="span" variant="bodySm" tone="caution">
                Set an end date to see countdown
              </Text>
            </>
          )}
        </InlineStack>
      </BlockStack>

      {/* Animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </Card>
  );
}
