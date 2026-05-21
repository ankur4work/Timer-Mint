import prisma from "~/db.server";
export { PLAN_FREE, PLAN_STANDARD, PLAN_PREMIUM, PLANS } from "~/lib/plans";
export type { PlanName, PlanConfig } from "~/lib/plans";
import {
  PLAN_FREE,
  PLAN_PREMIUM,
  PLAN_STANDARD,
  PLANS,
  type PlanConfig,
  type PlanName,
} from "~/lib/plans";

function parsePrice(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseTrialDays(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function getBillingTrialDays(plan: PlanName) {
  if (plan === PLAN_STANDARD) {
    return parseTrialDays(process.env.BILLING_STANDARD_TRIAL_DAYS, 0);
  }

  if (plan === PLAN_PREMIUM) {
    return parseTrialDays(process.env.BILLING_PREMIUM_TRIAL_DAYS, 0);
  }

  return 0;
}

export function getBillingPlanConfig(plan: PlanName): PlanConfig {
  if (plan === PLAN_STANDARD) {
    return {
      ...PLANS[PLAN_STANDARD],
      name: (process.env.BILLING_STANDARD_NAME as PlanName | undefined) || PLAN_STANDARD,
      price: parsePrice(process.env.BILLING_STANDARD_PRICE, PLANS[PLAN_STANDARD].price),
    };
  }

  if (plan === PLAN_PREMIUM) {
    return {
      ...PLANS[PLAN_PREMIUM],
      name: (process.env.BILLING_PREMIUM_NAME as PlanName | undefined) || PLAN_PREMIUM,
      price: parsePrice(process.env.BILLING_PREMIUM_PRICE, PLANS[PLAN_PREMIUM].price),
    };
  }

  return PLANS[PLAN_FREE];
}

export function getBillingPlans(): Record<PlanName, PlanConfig> {
  return {
    [PLAN_FREE]: PLANS[PLAN_FREE],
    [PLAN_STANDARD]: getBillingPlanConfig(PLAN_STANDARD),
    [PLAN_PREMIUM]: getBillingPlanConfig(PLAN_PREMIUM),
  };
}

function getBillingCurrency() {
  return process.env.BILLING_CURRENCY || "USD";
}

function getBillingInterval() {
  return process.env.BILLING_INTERVAL || "EVERY_30_DAYS";
}

// --- DB Helpers ---

export async function getShopPlan(shop: string): Promise<PlanName> {
  const sub = await prisma.shopSubscription.findUnique({ where: { shop } });
  if (!sub || sub.status !== "ACTIVE") return PLAN_FREE;
  const plan = sub.plan as PlanName;
  return PLANS[plan] ? plan : PLAN_FREE;
}

export async function getShopSubscription(shop: string) {
  return prisma.shopSubscription.findUnique({ where: { shop } });
}

export async function upsertShopSubscription(
  shop: string,
  plan: PlanName,
  subscriptionId: string | null,
  status: string
) {
  return prisma.shopSubscription.upsert({
    where: { shop },
    update: { plan, subscriptionId, status, updatedAt: new Date() },
    create: { shop, plan, subscriptionId, status },
  });
}

export async function cancelShopSubscription(shop: string) {
  const existing = await prisma.shopSubscription.findUnique({ where: { shop } });
  if (existing) {
    return prisma.shopSubscription.update({
      where: { shop },
      data: { plan: PLAN_FREE, status: "CANCELLED" },
    });
  }
}

// --- Shopify GraphQL ---

const APP_SUBSCRIPTION_CREATE = `#graphql
  mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $test: Boolean, $trialDays: Int) {
    appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test, trialDays: $trialDays) {
      userErrors {
        field
        message
      }
      confirmationUrl
      appSubscription {
        id
        status
      }
    }
  }
`;

const APP_SUBSCRIPTION_CANCEL = `#graphql
  mutation appSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

const GET_SUBSCRIPTION_BY_ID = `#graphql
  query getSubscription($id: ID!) {
    node(id: $id) {
      ... on AppSubscription {
        id
        status
        name
      }
    }
  }
`;

export async function createSubscription(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ json: () => Promise<{ data?: { appSubscriptionCreate?: { confirmationUrl?: string; appSubscription?: { id: string; status: string }; userErrors: { field: string; message: string }[] } } }> }> },
  plan: PlanName,
  returnUrl: string,
  isTest: boolean = false
) {
  const planConfig = getBillingPlanConfig(plan);
  const currencyCode = getBillingCurrency();
  const interval = getBillingInterval();
  const trialDays = getBillingTrialDays(plan);

  const response = await admin.graphql(APP_SUBSCRIPTION_CREATE, {
    variables: {
      name: `${planConfig.name} Plan - $${planConfig.price}/month`,
      returnUrl,
      test: isTest,
      trialDays,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: planConfig.price, currencyCode },
              interval,
            },
          },
        },
      ],
    },
  });

  const json = await response.json();
  return json.data?.appSubscriptionCreate ?? { confirmationUrl: null, appSubscription: null, userErrors: [] };
}

export async function getSubscriptionById(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ json: () => Promise<{ data?: { node?: { id: string; status: string; name: string } } }> }> },
  id: string
) {
  const response = await admin.graphql(GET_SUBSCRIPTION_BY_ID, {
    variables: { id },
  });
  const json = await response.json();
  return json.data?.node ?? null;
}

export async function cancelSubscriptionOnShopify(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ json: () => Promise<{ data?: { appSubscriptionCancel?: { userErrors: { field: string; message: string }[]; appSubscription?: { id: string; status: string } } } }> }> },
  subscriptionId: string
) {
  const response = await admin.graphql(APP_SUBSCRIPTION_CANCEL, {
    variables: { id: subscriptionId },
  });
  const json = await response.json();
  return json.data?.appSubscriptionCancel ?? { userErrors: [], appSubscription: null };
}
