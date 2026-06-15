// Plan tiers and the features each unlocks. These mirror the plans you create
// in the Partner Dashboard under **Managed Pricing**. The plan NAMES below must
// match the plan names you type there exactly (see SUBSCRIPTION_NAME_TO_PLAN).

export type PlanId = "free" | "pro" | "premium";

export interface PlanFeatures {
  id: PlanId;
  name: string;
  price: string;
  blurb: string;
  fullCatalog: boolean;
  customUploads: boolean;
}

export const PLANS: Record<PlanId, PlanFeatures> = {
  free: {
    id: "free",
    name: "Free",
    price: "0 €",
    blurb: "3 elementos para empezar.",
    fullCatalog: false,
    customUploads: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "1 €/mes",
    blurb: "Catálogo completo de elementos.",
    fullCatalog: true,
    customUploads: false,
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: "2 €/mes",
    blurb: "Catálogo completo + sube tus propios emojis y SVG.",
    fullCatalog: true,
    customUploads: true,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "premium"];

// Maps the subscription name shown by Shopify to our internal plan id.
// IMPORTANT: keep these strings in sync with the plan names in Managed Pricing.
const SUBSCRIPTION_NAME_TO_PLAN: Record<string, PlanId> = {
  Pro: "pro",
  Premium: "premium",
};

export function planFromSubscriptionNames(names: string[]): PlanId {
  const ids = names
    .map((n) => SUBSCRIPTION_NAME_TO_PLAN[n.trim()])
    .filter(Boolean) as PlanId[];
  if (ids.includes("premium")) return "premium";
  if (ids.includes("pro")) return "pro";
  return "free";
}
