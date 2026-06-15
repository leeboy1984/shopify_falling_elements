import prisma from "../db.server";
import { elementById, isElementAllowed } from "./catalog";
import type { PlanId } from "./plans";

export type ConfigInput = {
  enabled?: boolean;
  preset?: string;
  density?: number;
  speed?: number;
  size?: number;
  wind?: number;
  rotation?: boolean;
  opacity?: number;
  pages?: string;
  startAt?: Date | null;
  endAt?: Date | null;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

export async function getShopConfig(shop: string) {
  const existing = await prisma.shopConfig.findUnique({ where: { shop } });
  if (existing) return existing;
  return prisma.shopConfig.create({ data: { shop } });
}

/**
 * Persists config after validating ranges and enforcing the plan gate: a free
 * shop cannot save a paid element even if the form is tampered with.
 */
export async function saveShopConfig(
  shop: string,
  plan: PlanId,
  input: ConfigInput,
) {
  const data: ConfigInput = { ...input };

  if (data.preset && !isElementAllowed(data.preset, plan)) {
    throw new Response("Element not available on your plan", { status: 403 });
  }

  if (data.density != null) data.density = clamp(data.density, 5, 150);
  if (data.speed != null) data.speed = clamp(data.speed, 0, 100);
  if (data.size != null) data.size = clamp(data.size, 8, 96);
  if (data.wind != null) data.wind = clamp(data.wind, -100, 100);
  if (data.opacity != null) data.opacity = clamp(data.opacity, 0, 100);

  return prisma.shopConfig.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
}

export async function setPlan(shop: string, plan: PlanId) {
  return prisma.shopConfig.upsert({
    where: { shop },
    create: { shop, plan },
    update: { plan },
  });
}

/**
 * The payload served to the storefront via the app proxy. Reads everything from
 * the DB (no Admin API call) so it stays fast on customer-facing requests.
 * Custom assets are only included for Premium shops.
 */
export async function getPublicConfig(shop: string) {
  const config = await getShopConfig(shop);
  const element = elementById(config.preset);
  const isPremium = config.plan === "premium";
  const assets = isPremium
    ? await prisma.customAsset.findMany({ where: { shop } })
    : [];

  const now = Date.now();
  const withinWindow =
    (!config.startAt || config.startAt.getTime() <= now) &&
    (!config.endAt || config.endAt.getTime() >= now);

  return {
    enabled: config.enabled && withinWindow,
    preset: config.preset,
    glyph: element?.glyph ?? "🍂",
    density: config.density,
    speed: config.speed,
    size: config.size,
    wind: config.wind,
    rotation: config.rotation,
    opacity: config.opacity,
    pages: config.pages,
    assets: assets.map((a) => ({ kind: a.kind, value: a.value })),
  };
}

export async function getCustomAssets(shop: string) {
  return prisma.customAsset.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteCustomAsset(shop: string, id: string) {
  // Scope delete by shop so one shop can't delete another's asset.
  await prisma.customAsset.deleteMany({ where: { id, shop } });
}
