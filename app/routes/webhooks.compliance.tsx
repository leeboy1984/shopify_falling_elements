import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Mandatory GDPR / privacy webhooks. Shopify verifies the HMAC; we just respond
// 200 and act on the data we hold. This app stores NO customer personal data —
// only per-shop effect settings — so customer topics are no-ops.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  // eslint-disable-next-line no-console
  console.log(`Received ${topic} compliance webhook for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // No customer-level data stored — nothing to return.
      break;
    case "CUSTOMERS_REDACT":
      // No customer-level data stored — nothing to delete.
      break;
    case "SHOP_REDACT":
      // 48h after uninstall: erase everything we hold for this shop.
      await prisma.customAsset.deleteMany({ where: { shop } });
      await prisma.shopConfig.deleteMany({ where: { shop } });
      await prisma.session.deleteMany({ where: { shop } });
      break;
    default:
      break;
  }

  return new Response();
};
