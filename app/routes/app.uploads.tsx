import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getActivePlan, syncPlan } from "../lib/billing.server";
import { deleteCustomAsset, getCustomAssets } from "../lib/config.server";
import { sanitizeEmoji, sanitizeSvg } from "../lib/sanitize.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await syncPlan(admin, session.shop);
  const assets = plan === "premium" ? await getCustomAssets(session.shop) : [];
  return { plan, assets };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await getActivePlan(admin);

  // Hard server-side gate: uploads are Premium-only.
  if (plan !== "premium") {
    return { ok: false as const, error: "Las subidas son exclusivas del plan Premium." };
  }

  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "delete") {
    await deleteCustomAsset(session.shop, String(form.get("id")));
    return { ok: true as const };
  }

  const kind = String(form.get("kind"));
  const name = String(form.get("name") || "Sin nombre").slice(0, 60);
  const raw = String(form.get("value") || "");

  const result = kind === "emoji" ? sanitizeEmoji(raw) : sanitizeSvg(raw);
  if (!result.ok) {
    return { ok: false as const, error: result.reason ?? "Contenido no válido." };
  }

  await prisma.customAsset.create({
    data: { shop: session.shop, name, kind, value: result.svg! },
  });
  return { ok: true as const };
};

export default function Uploads() {
  const { plan, assets } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [kind, setKind] = useState("emoji");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  if (plan !== "premium") {
    return (
      <Page>
        <TitleBar title="Mis subidas" />
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Sube tus propios elementos"
                action={{ content: "Pasar a Premium", url: "/app/billing" }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Con el plan Premium (2 €/mes) puedes subir tus propios emojis y
                  SVG para que caigan por tu tienda.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const add = () => {
    submit({ intent: "add", kind, name, value }, { method: "post" });
    setName("");
    setValue("");
  };

  return (
    <Page>
      <TitleBar title="Mis subidas" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.ok && <Banner tone="success" title="Guardado" />}
            {actionData && !actionData.ok && (
              <Banner tone="critical" title={actionData.error} />
            )}

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Añadir elemento
                </Text>
                <Select
                  label="Tipo"
                  options={[
                    { label: "Emoji", value: "emoji" },
                    { label: "SVG (pegar código)", value: "svg" },
                  ]}
                  value={kind}
                  onChange={setKind}
                />
                <TextField
                  label="Nombre"
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                  maxLength={60}
                />
                {kind === "emoji" ? (
                  <TextField
                    label="Emoji"
                    value={value}
                    onChange={setValue}
                    autoComplete="off"
                    maxLength={8}
                    placeholder="🦄"
                  />
                ) : (
                  <TextField
                    label="Código SVG"
                    value={value}
                    onChange={setValue}
                    autoComplete="off"
                    multiline={6}
                    placeholder="<svg ...>...</svg>"
                    helpText="El SVG se sanitiza por seguridad antes de mostrarse en tu tienda."
                  />
                )}
                <InlineStack align="end">
                  <Button variant="primary" onClick={add} disabled={!value}>
                    Añadir
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Tus elementos ({assets.length})
                </Text>
                {assets.length === 0 ? (
                  <Text as="p" tone="subdued">
                    Aún no has subido nada.
                  </Text>
                ) : (
                  assets.map((a) => (
                    <InlineStack
                      key={a.id}
                      align="space-between"
                      blockAlign="center"
                    >
                      <InlineStack gap="200" blockAlign="center">
                        <Badge>{a.kind}</Badge>
                        <Text as="span">{a.name}</Text>
                        {a.kind === "emoji" && (
                          <Text as="span" variant="headingLg">
                            {a.value}
                          </Text>
                        )}
                      </InlineStack>
                      <Button
                        tone="critical"
                        variant="plain"
                        onClick={() =>
                          submit(
                            { intent: "delete", id: a.id },
                            { method: "post" },
                          )
                        }
                      >
                        Eliminar
                      </Button>
                    </InlineStack>
                  ))
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
