import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  // eslint-disable-next-line no-console
  console.log(`Received ${topic} webhook for ${shop}`);

  // The shop uninstalled the app: drop its sessions so we re-auth on reinstall.
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
