import { z } from "zod";
import prisma from "~/db.server";
import { TimerType, Status, Position } from "~/types";

// Zod validation schemas
export const TimerTypeSchema = z.enum(["COUNTDOWN", "EVERGREEN", "DAILY", "FIXED"]);
export const StatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const PositionSchema = z.enum([
  "TOP",
  "BOTTOM",
  "FLOATING_TOP",
  "FLOATING_BOTTOM",
  "TOP_LEFT",
  "TOP_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_RIGHT",
  "LEFT_VERTICAL",
  "RIGHT_VERTICAL",
]);

export const TimerCreateSchema = z.object({
  name: z.string().min(1, "Timer name is required").max(100),
  type: TimerTypeSchema.default("COUNTDOWN"),
  status: StatusSchema.default("INACTIVE"),

  // Timing
  startDate: z.string().optional().nullable(),
  endDate: z.string().min(1, "End date is required"),
  timezone: z.string().default("UTC"),

  // Evergreen settings
  evergreenDuration: z.coerce.number().int().positive().optional().nullable(),
  evergreenResetDelay: z.coerce.number().int().min(0).optional().nullable(),

  // Daily settings
  dailyStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional().nullable(),
  dailyEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional().nullable(),

  // Display settings
  position: PositionSchema.default("TOP"),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color").default("#000000"),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color").default("#FFFFFF"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color").default("#FF0000"),

  // Content
  preText: z.string().max(200).optional().nullable(),
  postText: z.string().max(200).optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  linkText: z.string().max(50).optional().nullable(),

  // Targeting
  showOnAllPages: z.coerce.boolean().default(true),
  targetPages: z.string().optional().nullable(),
  excludePages: z.string().optional().nullable(),

  // Advanced settings
  showDays: z.coerce.boolean().default(true),
  showHours: z.coerce.boolean().default(true),
  showMinutes: z.coerce.boolean().default(true),
  showSeconds: z.coerce.boolean().default(true),
  showLabels: z.coerce.boolean().default(true),
  closeButton: z.coerce.boolean().default(true),
  stickyOnScroll: z.coerce.boolean().default(true),

  // Animation
  animation: z.string().optional().nullable(),
});

export const TimerUpdateSchema = TimerCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type TimerCreateInput = z.infer<typeof TimerCreateSchema>;
export type TimerUpdateInput = z.infer<typeof TimerUpdateSchema>;

// CRUD Operations

export async function getTimers(shop: string, filters?: {
  status?: string;
  type?: string;
  search?: string;
}) {
  const where: any = { shop };

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status;
  }

  if (filters?.type && filters.type !== "all") {
    where.type = filters.type;
  }

  if (filters?.search) {
    where.name = {
      contains: filters.search,
    };
  }

  return prisma.timer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTimer(id: string, shop: string) {
  return prisma.timer.findFirst({
    where: {
      id,
      shop,
    },
  });
}

export async function createTimer(shop: string, data: TimerCreateInput) {
  const validated = TimerCreateSchema.parse(data);

  return prisma.timer.create({
    data: {
      shop,
      name: validated.name,
      type: validated.type,
      status: validated.status,
      startDate: validated.startDate ? new Date(validated.startDate) : null,
      endDate: new Date(validated.endDate),
      timezone: validated.timezone,
      evergreenDuration: validated.evergreenDuration,
      evergreenResetDelay: validated.evergreenResetDelay,
      dailyStartTime: validated.dailyStartTime,
      dailyEndTime: validated.dailyEndTime,
      position: validated.position,
      backgroundColor: validated.backgroundColor,
      textColor: validated.textColor,
      accentColor: validated.accentColor,
      preText: validated.preText,
      postText: validated.postText,
      linkUrl: validated.linkUrl || null,
      linkText: validated.linkText,
      showOnAllPages: validated.showOnAllPages,
      targetPages: validated.targetPages,
      excludePages: validated.excludePages,
      showDays: validated.showDays,
      showHours: validated.showHours,
      showMinutes: validated.showMinutes,
      showSeconds: validated.showSeconds,
      showLabels: validated.showLabels,
      closeButton: validated.closeButton,
      stickyOnScroll: validated.stickyOnScroll,
      animation: validated.animation,
    },
  });
}

export async function updateTimer(id: string, shop: string, data: Partial<TimerCreateInput>) {
  // Verify timer belongs to shop
  const existing = await getTimer(id, shop);
  if (!existing) {
    throw new Error("Timer not found");
  }

  const updateData: any = { ...data };

  // Convert date strings to Date objects
  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    updateData.endDate = new Date(data.endDate);
  }

  // Handle empty linkUrl
  if (data.linkUrl === "") {
    updateData.linkUrl = null;
  }

  return prisma.timer.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteTimer(id: string, shop: string) {
  // Verify timer belongs to shop
  const existing = await getTimer(id, shop);
  if (!existing) {
    throw new Error("Timer not found");
  }

  return prisma.timer.delete({
    where: { id },
  });
}

export async function deleteTimers(ids: string[], shop: string) {
  return prisma.timer.deleteMany({
    where: {
      id: { in: ids },
      shop,
    },
  });
}

export async function updateTimersStatus(ids: string[], shop: string, status: string) {
  const validStatus = StatusSchema.parse(status);

  return prisma.timer.updateMany({
    where: {
      id: { in: ids },
      shop,
    },
    data: { status: validStatus },
  });
}

// Validation helper
export function validateTimerData(data: unknown) {
  return TimerCreateSchema.safeParse(data);
}
