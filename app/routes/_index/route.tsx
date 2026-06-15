import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData<typeof loader>();
  return (
    <main
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: 640,
        margin: "80px auto",
        padding: "0 24px",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 32 }}>🍂 Floating Elements</h1>
      <p>
        Añade elementos que caen (hojas, nieve, emojis o tus propios SVG) sobre
        tu tienda. Configúralo todo desde el panel y actívalo con un clic en el
        editor de temas.
      </p>
      {showForm && (
        <Form method="post" action="/auth/login" style={{ marginTop: 24 }}>
          <label style={{ display: "block", fontWeight: 600 }}>
            Dominio de la tienda
            <input
              type="text"
              name="shop"
              placeholder="mi-tienda.myshopify.com"
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                marginTop: 6,
              }}
            />
          </label>
          <button type="submit" style={{ marginTop: 12, padding: "10px 16px" }}>
            Instalar
          </button>
        </Form>
      )}
    </main>
  );
}
