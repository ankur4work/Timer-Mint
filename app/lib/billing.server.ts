import prisma from "~/db.server";
export { PLAN_FREE, PLAN_STANDARD, PLAN_PREMIUM, PLANS } from "~/lib/plans";
export type { PlanName, PlanConfig } from "~/lib/plans";
import { PLAN_FREE, PLAN_PREMIUM, PLANS, type PlanName } from "~/lib/plans";

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
  mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $test: Boolean) {
    appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test) {
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
  const planConfig = PLANS[plan];
  const response = await admin.graphql(APP_SUBSCRIPTION_CREATE, {
    variables: {
      name: `${planConfig.name} Plan - $${planConfig.price}/month`,
      returnUrl,
      test: isTest,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: planConfig.price, currencyCode: "USD" },
              interval: "EVERY_30_DAYS",
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
