import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getActivePlan, syncPlan } from "../lib/billing.server";
import { getShopConfig, saveShopConfig } from "../lib/config.server";
import { CATALOG } from "../lib/catalog";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await syncPlan(admin, session.shop);
  const config = await getShopConfig(session.shop);
  return { plan, selected: config.preset, catalog: CATALOG };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await getActivePlan(admin);
  const form = await request.formData();
  try {
    await saveShopConfig(session.shop, plan, {
      preset: String(form.get("preset")),
    });
    return { ok: true as const };
  } catch (e) {
    if (e instanceof Response) {
      return { ok: false as const, error: "Mejora tu plan para usar este elemento." };
    }
    throw e;
  }
};

export default function Elements() {
  const { plan, selected, catalog } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const locked = plan === "free";

  const choose = (preset: string) =>
    submit({ preset }, { method: "post" });

  return (
    <Page>
      <TitleBar title="Catálogo de elementos" />
      <Layout>
        <Layout.Section>
          <Card>
            <InlineGrid columns={{ xs: 2, sm: 3, md: 4 }} gap="300">
              {catalog.map((el) => {
                const isLocked = locked && !el.free;
                const isSelected = el.id === selected;
                return (
                  <Box
                    key={el.id}
                    padding="300"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor={isSelected ? "border-emphasis" : "border"}
                    background={isSelected ? "bg-surface-selected" : "bg-surface"}
                  >
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="span" variant="heading2xl">
                        {el.glyph}
                      </Text>
                      <Text as="span" variant="bodySm" alignment="center">
                        {el.name}
                      </Text>
                      {isLocked ? (
                        <Button
                          size="micro"
                          url="/app/billing"
                          icon={undefined}
                        >
                          🔒 Pro
                        </Button>
                      ) : isSelected ? (
                        <Badge tone="success">En uso</Badge>
                      ) : (
                        <Button size="micro" onClick={() => choose(el.id)}>
                          Usar
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                );
              })}
            </InlineGrid>
          </Card>
        </Layout.Section>

        {locked && (
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Desbloquea todo el catálogo
                  </Text>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Con el plan Pro (1 €/mes) accedes a todos los elementos. Con
                  Premium (2 €/mes) además puedes subir los tuyos.
                </Text>
                <Button variant="primary" url="/app/billing">
                  Ver planes
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
