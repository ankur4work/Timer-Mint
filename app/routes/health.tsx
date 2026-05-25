import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "HEAD") {
    return new Response(null, { status: 204 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, database: "up" });
  } catch (error) {
    console.error("Health check failed", error);
    return json({ ok: false, database: "down" }, { status: 503 });
  }
};
