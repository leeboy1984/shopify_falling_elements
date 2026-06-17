import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { getPublicConfig } from "./config.server";

type AdminGraphql = Pick<AdminApiContext, "graphql">;

/**
 * Publishes the effect config to a shop metafield (floating_elements.config).
 * The theme app extension reads this directly in Liquid, so the storefront
 * needs no network request and no App Proxy — faster and dev-friendly.
 */
export async function publishStorefrontConfig(
  admin: AdminGraphql,
  shop: string,
) {
  const config = await getPublicConfig(shop);

  const shopRes = await admin.graphql(
    `#graphql
      query ShopId { shop { id } }`,
  );
  const shopId = (await shopRes.json())?.data?.shop?.id;
  if (!shopId) return;

  const res = await admin.graphql(
    `#graphql
      mutation SetConfig($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: "floating_elements",
            key: "config",
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    },
  );

  const body = await res.json();
  const errors = body?.data?.metafieldsSet?.userErrors;
  if (errors && errors.length) {
    // eslint-disable-next-line no-console
    console.error("metafieldsSet errors", errors);
  }
}
