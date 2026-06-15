# 🍂 Floating Elements

App de Shopify que hace **caer elementos** (hojas, nieve, emojis o tus propios
SVG) sobre el escaparate de la tienda, configurable desde un panel en el Admin.
Modelo **freemium** gestionado con **Shopify Managed Pricing**.

| Plan | Precio | Incluye |
| --- | --- | --- |
| Free | 0 € | 3 elementos + personalización completa |
| Pro | 1 €/mes | Catálogo completo de elementos |
| Premium | 2 €/mes | Catálogo completo + subir tus propios emojis y SVG |

> **Sobre los cobros:** las apps publicadas en el App Store de Shopify están
> **obligadas** a cobrar las suscripciones a través de Shopify (Billing API /
> Managed Pricing). No se puede usar Square/Stripe para la cuota del comerciante.
> Por eso esta app usa **Managed Pricing**: defines los planes en el Partner
> Dashboard y Shopify gestiona la página de precios y los cobros.

---

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────────────┐
│  Admin embebido      │     │  Backend (Remix)      │     │  Escaparate (tema)      │
│  Polaris + AppBridge │◄───►│  - OAuth/sesiones      │◄───►│  Theme app extension    │
│  - Panel de config   │     │  - ShopConfig (Prisma) │     │  (app embed) + canvas   │
│  - Catálogo (gated)  │     │  - Plan (Managed Pric.)│     │  renderer sin deps      │
│  - Subidas (Premium) │     │  - App Proxy /config   │     │  lee /apps/.../config   │
└─────────────────────┘     └──────────────────────┘     └────────────────────────┘
```

- **Admin** (`app/routes/app.*`): panel con Polaris para elegir elemento,
  cantidad, velocidad, tamaño, viento, opacidad y en qué páginas se muestra.
- **Theme app extension** (`extensions/floating-elements`): el bloque *app embed*
  que el comerciante activa en el editor de temas. Carga un renderer en `<canvas>`
  que obtiene la config en vivo desde el App Proxy.
- **App Proxy** (`app/routes/proxy.config.tsx`): sirve la config como JSON a
  `https://{tienda}/apps/floating-elements/config`. Lee de la BD (sin llamar a la
  Admin API) para no penalizar el rendimiento del escaparate.
- **Plan gating**: se valida en el servidor al guardar (`config.server.ts`) y el
  plan se cachea en `ShopConfig.plan`, refrescado en cada visita al Admin y vía el
  webhook `app_subscriptions/update`.

## Estructura

```
app/
  routes/
    app._index.tsx              Panel principal (apariencia + activación)
    app.elements.tsx            Catálogo de elementos (bloqueo por plan)
    app.uploads.tsx             Subidas Premium (emoji / SVG sanitizado)
    app.billing.tsx             Planes → redirige a Managed Pricing
    proxy.config.tsx            Config JSON para el escaparate (App Proxy)
    webhooks.*.tsx              Uninstall, scopes, suscripción, GDPR
  lib/
    catalog.ts                  Catálogo + qué es gratis vs de pago
    plans.ts                    Planes y features
    billing.server.ts           Lee/cachea el plan; URL de Managed Pricing
    config.server.ts            Lectura/escritura de ShopConfig + payload público
    sanitize.server.ts          Sanitización de SVG/emoji subidos ⚠️
extensions/floating-elements/   Theme app extension (Liquid + canvas renderer)
prisma/schema.prisma            Session, ShopConfig, CustomAsset
```

## Puesta en marcha (desarrollo)

Requisitos: Node ≥ 20.10, una [cuenta de Shopify Partner](https://partners.shopify.com)
y una *development store*.

```bash
npm install
npx prisma migrate dev          # crea la BD SQLite local y el cliente Prisma
npm run dev                     # Shopify CLI: pide login, crea túnel y enlaza la app
```

`npm run dev` (Shopify CLI) te guiará para crear/seleccionar la app en tu Partner
Dashboard y rellenará `client_id` en `shopify.app.toml` y las variables en `.env`.

### Configurar los planes (Managed Pricing)

1. Partner Dashboard → tu app → **Pricing** → activa *Managed Pricing*.
2. Crea dos planes recurrentes con estos **nombres exactos** (deben coincidir con
   `SUBSCRIPTION_NAME_TO_PLAN` en `app/lib/plans.ts`):
   - **Pro** — 1 €/mes
   - **Premium** — 2 €/mes
3. Copia el *app handle* a `SHOPIFY_APP_HANDLE` en `.env` (para la URL de precios).

## Producción

- Cambia el `provider` de Prisma a `postgresql` y usa un Postgres gestionado.
- Sirve detrás de HTTPS en tu host (Fly.io, Railway…). `npm run build` + `npm start`.
- `npm run deploy` publica la config de la app y la theme extension.

## Checklist antes de enviar al App Store

- [x] Sanitización robusta de SVG con DOMPurify + svgo (`sanitize.server.ts`).
- [x] Vista previa en vivo del efecto en el panel del Admin (`EffectPreview.tsx`).
- [x] Webhooks de compliance GDPR respondiendo 200.
- [ ] Revisar impacto en rendimiento del escaparate (Core Web Vitals).
- [ ] Recortar `access_scopes` a lo estrictamente necesario.
- [ ] Política de privacidad y ficha del listado.
- [ ] Probar instalación/actualización/cancelación de plan de punta a punta.

## Pendiente / ideas

- Programación estacional (los campos `startAt`/`endAt` ya existen en el modelo).
- Almacenamiento de imágenes subidas (S3/R2) además de SVG pegado.
- Selector explícito de "usar mis subidas" vs catálogo.
