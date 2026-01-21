// Timer type enum
export const TimerType = {
  COUNTDOWN: "COUNTDOWN",
  FIXED: "FIXED",
  EVERGREEN: "EVERGREEN",
  DAILY: "DAILY",
} as const;
export type TimerType = (typeof TimerType)[keyof typeof TimerType];

// Status enum
export const Status = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type Status = (typeof Status)[keyof typeof Status];

// Position enum
export const Position = {
  TOP: "TOP",
  BOTTOM: "BOTTOM",
  FLOATING_TOP: "FLOATING_TOP",
  FLOATING_BOTTOM: "FLOATING_BOTTOM",
  TOP_LEFT: "TOP_LEFT",
  TOP_RIGHT: "TOP_RIGHT",
  BOTTOM_LEFT: "BOTTOM_LEFT",
  BOTTOM_RIGHT: "BOTTOM_RIGHT",
  LEFT_VERTICAL: "LEFT_VERTICAL",
  RIGHT_VERTICAL: "RIGHT_VERTICAL",
} as const;
export type Position = (typeof Position)[keyof typeof Position];

// Timer interface matching Prisma model
export interface Timer {
  id: string;
  shop: string;
  name: string;
  type: TimerType;
  status: Status;
  startDate: Date | null;
  endDate: Date;
  timezone: string;
  evergreenDuration: number | null;
  evergreenResetDelay: number | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  position: Position;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  preText: string | null;
  postText: string | null;
  linkUrl: string | null;
  linkText: string | null;
  showOnAllPages: boolean;
  targetPages: string | null;
  excludePages: string | null;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  showLabels: boolean;
  closeButton: boolean;
  stickyOnScroll: boolean;
  animation: string | null;
  createdAt: Date;
  updatedAt: Date;
  settingsId: string | null;
}

// Settings interface matching Prisma model
export interface Settings {
  id: string;
  shop: string;
  defaultPosition: Position;
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
  createdAt: Date;
  updatedAt: Date;
}
