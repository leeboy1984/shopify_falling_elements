import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getActivePlan } from "../lib/billing.server";
import { setPlan } from "../lib/config.server";

// Fires when a merchant subscribes, upgrades, downgrades, or cancels through
// Managed Pricing. We re-read the active plan and cache it on the shop config
// so the storefront proxy reflects the change immediately.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, shop, topic } = await authenticate.webhook(request);
  // eslint-disable-next-line no-console
  console.log(`Received ${topic} webhook for ${shop}`);

  if (admin) {
    const plan = await getActivePlan(admin);
    await setPlan(shop, plan);
  }

  return new Response();
};
