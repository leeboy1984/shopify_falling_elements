import type { PlanId } from "./plans";

export type ElementCategory =
  | "leaves"
  | "weather"
  | "celebration"
  | "nature"
  | "love"
  | "food";

export interface CatalogElement {
  id: string;
  name: string;
  category: ElementCategory;
  // The token the storefront renderer draws. Emoji are drawn as text;
  // "shape:*" ids map to lightweight built-in vector shapes.
  glyph: string;
  free: boolean;
}

// The 3 free elements come first. Everything else requires Pro or Premium.
export const CATALOG: CatalogElement[] = [
  // --- Free tier (3 elements) ---
  { id: "autumn-leaves", name: "Hojas de otoño", category: "leaves", glyph: "🍂", free: true },
  { id: "snow", name: "Nieve", category: "weather", glyph: "❄️", free: true },
  { id: "hearts", name: "Corazones", category: "love", glyph: "❤️", free: true },

  // --- Paid catalog (Pro / Premium) ---
  { id: "cherry-blossom", name: "Sakura", category: "nature", glyph: "🌸", free: false },
  { id: "maple", name: "Hoja de arce", category: "leaves", glyph: "🍁", free: false },
  { id: "rain", name: "Lluvia", category: "weather", glyph: "💧", free: false },
  { id: "stars", name: "Estrellas", category: "celebration", glyph: "⭐", free: false },
  { id: "sparkles", name: "Destellos", category: "celebration", glyph: "✨", free: false },
  { id: "confetti", name: "Confeti", category: "celebration", glyph: "🎉", free: false },
  { id: "balloons", name: "Globos", category: "celebration", glyph: "🎈", free: false },
  { id: "petals", name: "Pétalos", category: "nature", glyph: "🌹", free: false },
  { id: "leaves-green", name: "Hojas verdes", category: "leaves", glyph: "🍃", free: false },
  { id: "bubbles", name: "Burbujas", category: "weather", glyph: "🫧", free: false },
  { id: "ghosts", name: "Fantasmas", category: "celebration", glyph: "👻", free: false },
  { id: "pumpkins", name: "Calabazas", category: "celebration", glyph: "🎃", free: false },
  { id: "money", name: "Billetes", category: "celebration", glyph: "💸", free: false },
  { id: "coffee", name: "Café", category: "food", glyph: "☕", free: false },
];

export const FREE_ELEMENTS = CATALOG.filter((e) => e.free);

export function elementById(id: string): CatalogElement | undefined {
  return CATALOG.find((e) => e.id === id);
}

// Server-side gate: which catalog elements a given plan may use.
export function allowedElements(plan: PlanId): CatalogElement[] {
  return plan === "free" ? FREE_ELEMENTS : CATALOG;
}

export function isElementAllowed(id: string, plan: PlanId): boolean {
  const el = elementById(id);
  if (!el) return false;
  return el.free || plan !== "free";
}
