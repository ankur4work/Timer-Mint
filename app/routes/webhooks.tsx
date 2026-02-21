import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import db from "~/db.server";
import { cancelShopSubscription } from "~/lib/billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        // Clean up data when app is uninstalled
        await db.timer.deleteMany({ where: { shop } });
        await db.settings.deleteMany({ where: { shop } });
        await db.session.deleteMany({ where: { shop } });
        await db.shopSubscription.deleteMany({ where: { shop } });
      }
      break;

    case "APP_SUBSCRIPTIONS_UPDATE":
      if (payload && session) {
        const { app_subscription } = payload as {
          app_subscription?: {
            status?: string;
            admin_graphql_api_id?: string;
          };
        };
        const status = app_subscription?.status?.toUpperCase();
        const gid = app_subscription?.admin_graphql_api_id;
        if (
          status === "CANCELLED" ||
          status === "FROZEN" ||
          status === "DECLINED"
        ) {
          await cancelShopSubscription(shop);
        } else if (status === "ACTIVE" && gid) {
          const sub = await db.shopSubscription.findUnique({ where: { shop } });
          if (sub) {
            await db.shopSubscription.update({
              where: { shop },
              data: { status: "ACTIVE" },
            });
          }
        }
      }
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
