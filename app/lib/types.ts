/**
 * Timer Config Types for Metafield Storage
 *
 * These types define the JSON structure stored in the shop metafield.
 * The Liquid template reads this data to render timers without API calls.
 */

/**
 * Timer data stored in the metafield
 * This is a simplified version of the database model optimized for the storefront
 */
export interface MetafieldTimer {
  id: string;
  name: string;
  type: string; // COUNTDOWN, EVERGREEN, DAILY, FIXED
  status: string; // ACTIVE, INACTIVE

  // Timing
  startDate: string | null; // ISO date string
  endDate: string; // ISO date string
  timezone: string;

  // Evergreen settings
  evergreenDuration: number | null; // minutes
  evergreenResetDelay: number | null; // minutes

  // Daily settings
  dailyStartTime: string | null; // HH:MM
  dailyEndTime: string | null; // HH:MM
  recurringDays: string | null; // JSON array

  // Shipping settings
  shippingCutoffTime: string | null;
  shippingExcludedDays: string | null;
  shippingHolidays: string | null;
  shippingNextDayText: string | null;

  // Cart settings
  cartThreshold: number | null;
  cartTimerDuration: number | null;

  // Display
  position: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;

  // Content
  preText: string | null;
  postText: string | null;
  expiredText: string | null;
  linkUrl: string | null;
  linkText: string | null;

  // Targeting
  showOnAllPages: boolean;
  targetPages: string | null;
  excludePages: string | null;

  // Units display
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  showLabels: boolean;

  // UI
  closeButton: boolean;
  stickyOnScroll: boolean;
  animation: string | null;

  // Priority
  priority: number;
}

/**
 * Global settings stored in metafield
 */
export interface MetafieldSettings {
  defaultPosition: string;
  defaultBgColor: string;
  defaultTextColor: string;
  defaultAccentColor: string;
  fontFamily: string;
  fontSize: string;
  cookieDuration: number;
  customCSS: string | null;
}

/**
 * Complete timer config structure stored in metafield
 */
export interface TimersConfig {
  // Array of active timers
  timers: MetafieldTimer[];

  // Global settings
  settings: MetafieldSettings | null;

  // Metadata
  lastUpdated: string; // ISO date string
  version: number;
}

/**
 * Default config when no timers exist
 */
export const DEFAULT_TIMERS_CONFIG: TimersConfig = {
  timers: [],
  settings: null,
  lastUpdated: new Date().toISOString(),
  version: 1,
};
