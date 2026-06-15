import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getPublicConfig } from "../lib/config.server";

// Served to the storefront via the App Proxy at:
//   https://{shop}/apps/floating-elements/config
// `authenticate.public.appProxy` verifies Shopify's signed request.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session?.shop) {
    return new Response(JSON.stringify({ enabled: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const config = await getPublicConfig(session.shop);

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Customer-facing endpoint: cache so we don't query per page view.
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
};
