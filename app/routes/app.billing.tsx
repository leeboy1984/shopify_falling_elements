import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { managedPricingUrl, syncPlan } from "../lib/billing.server";
import { PLANS, PLAN_ORDER } from "../lib/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await syncPlan(admin, session.shop);
  const handle = process.env.SHOPIFY_APP_HANDLE || "floating-elements";
  return {
    current: plan,
    pricingUrl: managedPricingUrl(session.shop, handle),
  };
};

const FEATURES: Record<string, string[]> = {
  free: ["3 elementos seleccionados", "Personalización completa del efecto"],
  pro: ["Catálogo completo de elementos", "Todo lo del plan Free"],
  premium: [
    "Sube tus propios emojis y SVG",
    "Catálogo completo",
    "Todo lo del plan Pro",
  ],
};

export default function Billing() {
  const { current, pricingUrl } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Planes" />
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];
              const isCurrent = id === current;
              return (
                <Card key={id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        {plan.name}
                      </Text>
                      {isCurrent && <Badge tone="success">Plan actual</Badge>}
                    </InlineStack>
                    <Text as="p" variant="heading2xl">
                      {plan.price}
                    </Text>
                    <Divider />
                    <List>
                      {FEATURES[id].map((f) => (
                        <List.Item key={f}>{f}</List.Item>
                      ))}
                    </List>
                    <Button
                      variant={isCurrent ? "secondary" : "primary"}
                      disabled={isCurrent}
                      url={pricingUrl}
                      target="_top"
                    >
                      {isCurrent ? "Plan actual" : "Elegir plan"}
                    </Button>
                  </BlockStack>
                </Card>
              );
            })}
          </InlineGrid>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="p" tone="subdued" variant="bodySm">
                Los pagos se gestionan de forma segura a través de Shopify
                (Managed Pricing) y se cargan junto con tu factura de Shopify.
                Puedes cambiar o cancelar tu plan en cualquier momento.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
