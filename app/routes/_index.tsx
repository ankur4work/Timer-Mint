import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { login } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "HEAD") {
    return new Response(null, { status: 204 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("shop") || url.searchParams.get("host")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return login(request);
};

export default function App() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Timer Mint</h1>
      <p>Install Timer Mint on your Shopify store to start launching polished urgency bars.</p>
    </div>
  );
}
