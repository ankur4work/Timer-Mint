// Plan constants — safe for both server and client use

export const PLAN_FREE = "FREE" as const;
export const PLAN_STANDARD = "STANDARD" as const;
export const PLAN_PREMIUM = "PREMIUM" as const;

export type PlanName = typeof PLAN_FREE | typeof PLAN_STANDARD | typeof PLAN_PREMIUM;

export interface PlanConfig {
  name: PlanName;
  price: number;
  maxActiveTimers: number; // use 0 to represent Infinity for JSON-safe serialization
  features: string[];
  allowCustomCSS: boolean;
  allowABTesting: boolean;
}

// maxActiveTimers uses Number.MAX_SAFE_INTEGER to represent "unlimited" (JSON-safe)
export const PLANS: Record<PlanName, PlanConfig> = {
  [PLAN_FREE]: {
    name: PLAN_FREE,
    price: 0,
    maxActiveTimers: 1,
    features: ["1 active timer", "Basic colors", "Countdown type"],
    allowCustomCSS: false,
    allowABTesting: false,
  },
  [PLAN_STANDARD]: {
    name: PLAN_STANDARD,
    price: 50,
    maxActiveTimers: 5,
    features: ["5 active timers", "All timer types", "All features", "Custom CSS"],
    allowCustomCSS: true,
    allowABTesting: false,
  },
  [PLAN_PREMIUM]: {
    name: PLAN_PREMIUM,
    price: 150,
    // Represents unlimited — use a sentinel large number so JSON serialization works
    maxActiveTimers: Number.MAX_SAFE_INTEGER,
    features: ["Unlimited timers", "All features", "A/B Testing", "Priority support"],
    allowCustomCSS: true,
    allowABTesting: true,
  },
};
