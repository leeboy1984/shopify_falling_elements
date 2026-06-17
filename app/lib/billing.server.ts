import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { planFromSubscriptionNames, type PlanId } from "./plans";
import { setPlan } from "./config.server";
import { publishStorefrontConfig } from "./storefront.server";

// We only need the GraphQL client; structural type so it accepts the admin
// context whether or not the REST resources are present.
type AdminGraphql = Pick<AdminApiContext, "graphql">;

/**
 * Reads the shop's active plan from Shopify. With Managed Pricing the
 * subscription lifecycle is owned by Shopify, so we never create charges in
 * code — we only inspect what's currently active.
 */
export async function getActivePlan(
  admin: AdminGraphql,
): Promise<PlanId> {
  const response = await admin.graphql(
    `#graphql
      query CurrentSubscriptions {
        currentAppInstallation {
          activeSubscriptions {
            name
            status
          }
        }
      }`,
  );

  const body = await response.json();
  const subs =
    body?.data?.currentAppInstallation?.activeSubscriptions ?? [];
  const activeNames: string[] = subs
    .filter((s: { status: string }) => s.status === "ACTIVE")
    .map((s: { name: string }) => s.name);

  return planFromSubscriptionNames(activeNames);
}

/**
 * Reads the active plan AND caches it on the shop's config row, so the
 * storefront proxy can serve plan-gated content without an Admin API call.
 * Call this from admin loaders.
 */
export async function syncPlan(
  admin: AdminGraphql,
  shop: string,
): Promise<PlanId> {
  const plan = await getActivePlan(admin);
  await setPlan(shop, plan);
  // Keep the storefront metafield in sync on every admin visit (covers fresh
  // installs and revalidation after a save).
  await publishStorefrontConfig(admin, shop);
  return plan;
}

/**
 * Builds the Shopify-hosted Managed Pricing page URL where merchants pick or
 * change their plan. Redirect merchants here from the Plans page.
 * Docs: https://shopify.dev/docs/apps/launch/billing/managed-pricing
 */
export function managedPricingUrl(shop: string, appHandle: string): string {
  const storeHandle = shop.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}
