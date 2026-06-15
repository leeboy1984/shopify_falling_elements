import { useCallback, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Layout,
  Page,
  RangeSlider,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getActivePlan, syncPlan } from "../lib/billing.server";
import { getShopConfig, saveShopConfig } from "../lib/config.server";
import { elementById } from "../lib/catalog";
import { PLANS } from "../lib/plans";
import EffectPreview from "../components/EffectPreview";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await syncPlan(admin, session.shop);
  const config = await getShopConfig(session.shop);
  return {
    plan,
    planInfo: PLANS[plan],
    config,
    element: elementById(config.preset) ?? null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await getActivePlan(admin);
  const form = await request.formData();
  const num = (k: string) => Number(form.get(k));

  try {
    await saveShopConfig(session.shop, plan, {
      enabled: form.get("enabled") === "true",
      preset: String(form.get("preset")),
      density: num("density"),
      speed: num("speed"),
      size: num("size"),
      wind: num("wind"),
      opacity: num("opacity"),
      rotation: form.get("rotation") === "true",
      pages: String(form.get("pages")),
    });
    return { ok: true as const };
  } catch (e) {
    if (e instanceof Response) {
      return { ok: false as const, error: "Ese elemento no está disponible en tu plan." };
    }
    throw e;
  }
};

const PAGE_OPTIONS = [
  { label: "Toda la tienda", value: "all" },
  { label: "Solo inicio", value: "home" },
  { label: "Páginas de producto", value: "product" },
  { label: "Colecciones", value: "collection" },
  { label: "Carrito", value: "cart" },
];

export default function Dashboard() {
  const { config, element, planInfo } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submit = useSubmit();
  const saving = nav.state === "submitting";

  const [enabled, setEnabled] = useState(config.enabled);
  const [density, setDensity] = useState(config.density);
  const [speed, setSpeed] = useState(config.speed);
  const [size, setSize] = useState(config.size);
  const [wind, setWind] = useState(config.wind);
  const [opacity, setOpacity] = useState(config.opacity);
  const [rotation, setRotation] = useState(config.rotation);
  const [pages, setPages] = useState(config.pages);

  const save = useCallback(() => {
    const data = new FormData();
    data.set("enabled", String(enabled));
    data.set("preset", config.preset);
    data.set("density", String(density));
    data.set("speed", String(speed));
    data.set("size", String(size));
    data.set("wind", String(wind));
    data.set("opacity", String(opacity));
    data.set("rotation", String(rotation));
    data.set("pages", pages);
    submit(data, { method: "post" });
  }, [enabled, config.preset, density, speed, size, wind, opacity, rotation, pages, submit]);

  return (
    <Page>
      <TitleBar title="Floating Elements" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.ok && (
              <Banner tone="success" title="Configuración guardada" />
            )}
            {actionData && !actionData.ok && (
              <Banner tone="critical" title={actionData.error} />
            )}

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Efecto en la tienda
                  </Text>
                  <Badge tone={enabled ? "success" : undefined}>
                    {enabled ? "Activo" : "Desactivado"}
                  </Badge>
                </InlineStack>
                <Checkbox
                  label="Mostrar el efecto en la tienda"
                  checked={enabled}
                  onChange={setEnabled}
                />
                <Banner tone="info">
                  Recuerda activar también el bloque <b>Floating Elements</b> en
                  el editor de temas (Personalizar → Insertar aplicación) para
                  que se vea en el escaparate.
                </Banner>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Elemento seleccionado
                  </Text>
                  <Button url="/app/elements" variant="plain">
                    Cambiar elemento
                  </Button>
                </InlineStack>
                <InlineStack gap="300" blockAlign="center">
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <Text as="span" variant="heading2xl">
                      {element?.glyph ?? "🍂"}
                    </Text>
                  </Box>
                  <Text as="span" variant="bodyLg">
                    {element?.name ?? "Hojas de otoño"}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Apariencia
                </Text>
                <RangeSlider
                  label={`Cantidad (${density})`}
                  min={5}
                  max={150}
                  value={density}
                  onChange={(v) => setDensity(v as number)}
                  output
                />
                <RangeSlider
                  label={`Velocidad (${speed})`}
                  min={0}
                  max={100}
                  value={speed}
                  onChange={(v) => setSpeed(v as number)}
                  output
                />
                <RangeSlider
                  label={`Tamaño (${size}px)`}
                  min={8}
                  max={96}
                  value={size}
                  onChange={(v) => setSize(v as number)}
                  output
                />
                <RangeSlider
                  label={`Viento / deriva (${wind})`}
                  min={-100}
                  max={100}
                  value={wind}
                  onChange={(v) => setWind(v as number)}
                  output
                />
                <RangeSlider
                  label={`Opacidad (${opacity}%)`}
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(v) => setOpacity(v as number)}
                  output
                />
                <Checkbox
                  label="Rotar elementos al caer"
                  checked={rotation}
                  onChange={setRotation}
                />
                <Select
                  label="¿Dónde se muestra?"
                  options={PAGE_OPTIONS}
                  value={pages}
                  onChange={setPages}
                />
              </BlockStack>
            </Card>

            <InlineStack align="end">
              <Button variant="primary" loading={saving} onClick={save}>
                Guardar cambios
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Vista previa
                </Text>
                <EffectPreview
                  glyph={element?.glyph ?? "🍂"}
                  density={density}
                  speed={speed}
                  size={size}
                  wind={wind}
                  opacity={opacity}
                  rotation={rotation}
                />
                <Text as="p" tone="subdued" variant="bodySm">
                  Se actualiza al mover los controles. En la tienda el efecto
                  ocupa toda la pantalla.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Tu plan: {planInfo.name}
                </Text>
              <Text as="p" tone="subdued">
                {planInfo.blurb}
              </Text>
                <Button url="/app/billing">Ver planes</Button>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
