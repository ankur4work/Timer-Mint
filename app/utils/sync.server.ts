/**
 * Sync Server Utilities
 *
 * Syncs database timers to shop metafield for storefront access.
 * Call this after any timer create/update/delete operation.
 */

import prisma from "~/db.server";
import { setTimersConfig, deleteTimersConfig } from "~/lib/metafields.server";
import type { TimersConfig, MetafieldTimer, MetafieldSettings } from "~/lib/types";

/**
 * Convert a database timer to metafield format
 */
function timerToMetafield(timer: any): MetafieldTimer {
  return {
    id: timer.id,
    name: timer.name,
    type: timer.type,
    status: timer.status,

    // Timing - convert Date objects to ISO strings
    startDate: timer.startDate ? timer.startDate.toISOString() : null,
    endDate: timer.endDate.toISOString(),
    timezone: timer.timezone,

    // Evergreen settings
    evergreenDuration: timer.evergreenDuration,
    evergreenResetDelay: timer.evergreenResetDelay,

    // Daily settings
    dailyStartTime: timer.dailyStartTime,
    dailyEndTime: timer.dailyEndTime,
    recurringDays: timer.recurringDays,

    // Shipping settings
    shippingCutoffTime: timer.shippingCutoffTime,
    shippingExcludedDays: timer.shippingExcludedDays,
    shippingHolidays: timer.shippingHolidays,
    shippingNextDayText: timer.shippingNextDayText,

    // Cart settings
    cartThreshold: timer.cartThreshold,
    cartTimerDuration: timer.cartTimerDuration,

    // Display
    position: timer.position,
    backgroundColor: timer.backgroundColor,
    textColor: timer.textColor,
    accentColor: timer.accentColor,

    // Content
    preText: timer.preText,
    postText: timer.postText,
    expiredText: timer.expiredText,
    linkUrl: timer.linkUrl,
    linkText: timer.linkText,

    // Targeting
    showOnAllPages: timer.showOnAllPages,
    targetPages: timer.targetPages,
    excludePages: timer.excludePages,

    // Units display
    showDays: timer.showDays,
    showHours: timer.showHours,
    showMinutes: timer.showMinutes,
    showSeconds: timer.showSeconds,
    showLabels: timer.showLabels,

    // UI
    closeButton: timer.closeButton,
    stickyOnScroll: timer.stickyOnScroll,
    animation: timer.animation,

    // Priority
    priority: timer.priority ?? 5,
  };
}

/**
 * Convert database settings to metafield format
 */
function settingsToMetafield(settings: any): MetafieldSettings | null {
  if (!settings) return null;

  return {
    defaultPosition: settings.defaultPosition,
    defaultBgColor: settings.defaultBgColor,
    defaultTextColor: settings.defaultTextColor,
    defaultAccentColor: settings.defaultAccentColor,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    cookieDuration: settings.cookieDuration,
    customCSS: settings.customCSS,
  };
}

/**
 * Sync all ACTIVE timers from database to shop metafield
 *
 * @param admin - Shopify admin GraphQL client
 * @param shop - Shop domain
 * @returns boolean indicating success
 */
export async function syncTimersToMetafield(
  admin: any,
  shop: string
): Promise<boolean> {
  try {
    // Get all ACTIVE timers for this shop
    const timers = await prisma.timer.findMany({
      where: {
        shop,
        status: "ACTIVE",
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Get shop settings
    const settings = await prisma.settings.findUnique({
      where: { shop },
    });

    // If no active timers, we can delete the metafield or set empty config
    if (timers.length === 0) {
      const emptyConfig: TimersConfig = {
        timers: [],
        settings: settingsToMetafield(settings),
        lastUpdated: new Date().toISOString(),
        version: 1,
      };
      return await setTimersConfig(admin, emptyConfig);
    }

    // Build the config object
    const config: TimersConfig = {
      timers: timers.map(timerToMetafield),
      settings: settingsToMetafield(settings),
      lastUpdated: new Date().toISOString(),
      version: 1,
    };

    // Write to metafield
    const success = await setTimersConfig(admin, config);

    if (success) {
      console.log(`Synced ${timers.length} active timer(s) to metafield for ${shop}`);
    } else {
      console.error(`Failed to sync timers to metafield for ${shop}`);
    }

    return success;
  } catch (error) {
    console.error("Error syncing timers to metafield:", error);
    return false;
  }
}

/**
 * Clear the timers metafield (e.g., on app uninstall)
 */
export async function clearTimersMetafield(admin: any): Promise<boolean> {
  return await deleteTimersConfig(admin);
}
