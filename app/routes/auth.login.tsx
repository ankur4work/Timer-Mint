import type { LoaderFunctionArgs } from "@remix-run/node";
import { login } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "HEAD") {
    return new Response(null, { status: 204 });
  }

  return login(request);
};
