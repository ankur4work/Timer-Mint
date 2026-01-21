import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Popover,
  DatePicker,
  TextField,
  Select,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Button,
  Box,
  Icon,
} from "@shopify/polaris";
import { CalendarIcon } from "@shopify/polaris-icons";

interface DateTimePickerProps {
  label: string;
  value: string; // ISO string or datetime-local format
  onChange: (value: string) => void;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  showTimezone?: boolean;
  error?: string;
  helpText?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

// Common timezones
const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "US Eastern (New York)", value: "America/New_York" },
  { label: "US Central (Chicago)", value: "America/Chicago" },
  { label: "US Mountain (Denver)", value: "America/Denver" },
  { label: "US Pacific (Los Angeles)", value: "America/Los_Angeles" },
  { label: "UK (London)", value: "Europe/London" },
  { label: "Central Europe (Paris)", value: "Europe/Paris" },
  { label: "Eastern Europe (Moscow)", value: "Europe/Moscow" },
  { label: "India (Kolkata)", value: "Asia/Kolkata" },
  { label: "China (Shanghai)", value: "Asia/Shanghai" },
  { label: "Japan (Tokyo)", value: "Asia/Tokyo" },
  { label: "Australia Eastern (Sydney)", value: "Australia/Sydney" },
  { label: "New Zealand (Auckland)", value: "Pacific/Auckland" },
];

// Generate hour options
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: i.toString().padStart(2, "0"),
  value: i.toString().padStart(2, "0"),
}));

// Generate minute options (every 5 minutes)
const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  label: (i * 5).toString().padStart(2, "0"),
  value: (i * 5).toString().padStart(2, "0"),
}));

function parseDateTime(value: string): { date: Date | null; hour: string; minute: string } {
  if (!value) {
    return { date: null, hour: "00", minute: "00" };
  }

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return { date: null, hour: "00", minute: "00" };
    }
    return {
      date: d,
      hour: d.getHours().toString().padStart(2, "0"),
      minute: (Math.round(d.getMinutes() / 5) * 5).toString().padStart(2, "0"),
    };
  } catch {
    return { date: null, hour: "00", minute: "00" };
  }
}

function formatDateTimeLocal(date: Date, hour: string, minute: string): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatDisplayDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DateTimePicker({
  label,
  value,
  onChange,
  timezone = "UTC",
  onTimezoneChange,
  showTimezone = true,
  error,
  helpText,
  minDate,
  maxDate,
  disabled = false,
}: DateTimePickerProps) {
  const [popoverActive, setPopoverActive] = useState(false);
  const parsed = useMemo(() => parseDateTime(value), [value]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parsed.date || undefined
  );
  const [{ month, year }, setDate] = useState({
    month: parsed.date ? parsed.date.getMonth() : new Date().getMonth(),
    year: parsed.date ? parsed.date.getFullYear() : new Date().getFullYear(),
  });
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);

  // Sync internal state when value changes externally
  useEffect(() => {
    const newParsed = parseDateTime(value);
    if (newParsed.date) {
      setSelectedDate(newParsed.date);
      setDate({
        month: newParsed.date.getMonth(),
        year: newParsed.date.getFullYear(),
      });
      setHour(newParsed.hour);
      setMinute(newParsed.minute);
    }
  }, [value]);

  const togglePopover = useCallback(() => {
    if (!disabled) {
      setPopoverActive((active) => !active);
    }
  }, [disabled]);

  const handleMonthChange = useCallback(
    (newMonth: number, newYear: number) => {
      setDate({ month: newMonth, year: newYear });
    },
    []
  );

  const handleDateSelection = useCallback(
    (range: { start: Date; end: Date }) => {
      const newDate = range.start;
      setSelectedDate(newDate);

      const formatted = formatDateTimeLocal(newDate, hour, minute);
      onChange(formatted);
    },
    [hour, minute, onChange]
  );

  const handleHourChange = useCallback(
    (newHour: string) => {
      setHour(newHour);
      if (selectedDate) {
        const formatted = formatDateTimeLocal(selectedDate, newHour, minute);
        onChange(formatted);
      }
    },
    [selectedDate, minute, onChange]
  );

  const handleMinuteChange = useCallback(
    (newMinute: string) => {
      setMinute(newMinute);
      if (selectedDate) {
        const formatted = formatDateTimeLocal(selectedDate, hour, newMinute);
        onChange(formatted);
      }
    },
    [selectedDate, hour, onChange]
  );

  const handleClear = useCallback(() => {
    setSelectedDate(undefined);
    setHour("00");
    setMinute("00");
    onChange("");
    setPopoverActive(false);
  }, [onChange]);

  const handleSetNow = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    setDate({ month: now.getMonth(), year: now.getFullYear() });
    const newHour = now.getHours().toString().padStart(2, "0");
    const newMinute = (Math.round(now.getMinutes() / 5) * 5)
      .toString()
      .padStart(2, "0");
    setHour(newHour);
    setMinute(newMinute);
    const formatted = formatDateTimeLocal(now, newHour, newMinute);
    onChange(formatted);
  }, [onChange]);

  const displayValue = selectedDate
    ? `${formatDisplayDate(selectedDate)} at ${hour}:${minute}`
    : "";

  const activator = (
    <TextField
      label="Date and time"
      labelHidden
      value={displayValue}
      onChange={() => {}}
      onFocus={togglePopover}
      autoComplete="off"
      placeholder="Select date and time"
      prefix={<Icon source={CalendarIcon} />}
      error={error ? true : false}
      disabled={disabled}
      readOnly
    />
  );

  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <Popover
        active={popoverActive}
        activator={activator}
        onClose={togglePopover}
        preferredAlignment="left"
        fullWidth
      >
        <Box padding="300">
          <BlockStack gap="300">
            <DatePicker
              month={month}
              year={year}
              onChange={handleDateSelection}
              onMonthChange={handleMonthChange}
              selected={selectedDate}
              disableDatesBefore={minDate}
              disableDatesAfter={maxDate}
            />

            <InlineGrid columns={2} gap="200">
              <Select
                label="Hour"
                labelHidden
                options={HOURS}
                value={hour}
                onChange={handleHourChange}
              />
              <Select
                label="Minute"
                labelHidden
                options={MINUTES}
                value={minute}
                onChange={handleMinuteChange}
              />
            </InlineGrid>

            <InlineStack gap="200">
              <Button onClick={handleSetNow} size="slim">
                Set to now
              </Button>
              <Button onClick={handleClear} size="slim" tone="critical">
                Clear
              </Button>
              <div style={{ flex: 1 }} />
              <Button onClick={togglePopover} variant="primary" size="slim">
                Done
              </Button>
            </InlineStack>
          </BlockStack>
        </Box>
      </Popover>

      {showTimezone && onTimezoneChange && (
        <Select
          label=""
          labelHidden
          options={TIMEZONES}
          value={timezone}
          onChange={onTimezoneChange}
        />
      )}

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
