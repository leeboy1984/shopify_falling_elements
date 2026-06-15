// SVG sanitization for Premium custom uploads.
//
// SECURITY: user-uploaded SVGs are an XSS vector — they can carry <script>,
// event handlers, and external references that would execute in the MERCHANT'S
// storefront (a third party). We defend in two layers:
//   1. DOMPurify (via isomorphic-dompurify) with the strict SVG profile, which
//      removes scripts, event handlers and javascript: URLs.
//   2. We additionally forbid all href/xlink:href and external-loading tags so a
//      crafted SVG can't pull in or reference remote resources.
//   3. svgo then normalizes/optimizes the already-clean markup.
//   4. A final regex pass rejects anything suspicious that somehow survived.
import DOMPurify from "isomorphic-dompurify";
import { optimize } from "svgo";

export interface SanitizeResult {
  ok: boolean;
  svg?: string;
  reason?: string;
}

const MAX_BYTES = 50_000;

export function sanitizeSvg(raw: string): SanitizeResult {
  if (!raw || raw.length > MAX_BYTES) {
    return { ok: false, reason: "El SVG está vacío o es demasiado grande (máx. 50 KB)." };
  }
  if (!/^\s*<svg[\s>]/i.test(raw.trim())) {
    return { ok: false, reason: "El contenido no parece un SVG válido." };
  }

  // Layer 1 + 2: DOMPurify with a hardened SVG profile.
  let clean: string;
  try {
    clean = DOMPurify.sanitize(raw, {
      USE_PROFILES: { svg: true, svgFilters: true },
      // Block scripting, external loads and reference-based exfiltration.
      FORBID_TAGS: [
        "script",
        "foreignObject",
        "iframe",
        "embed",
        "object",
        "use",
        "image",
        "a",
        "set",
        "handler",
      ],
      // Drop all hyperlinks/references entirely (decorative SVGs don't need them).
      FORBID_ATTR: ["href", "xlink:href", "from", "to", "values", "begin"],
    });
  } catch {
    return { ok: false, reason: "No se pudo procesar el SVG." };
  }

  if (!clean || !/<svg[\s>]/i.test(clean)) {
    return { ok: false, reason: "El SVG no contiene contenido válido tras la limpieza." };
  }

  // Layer 3: optimize/normalize. Best-effort — fall back to the cleaned markup.
  let svg = clean;
  try {
    const result = optimize(clean, {
      multipass: true,
      plugins: ["preset-default"],
    });
    if (result.data && /^\s*<svg/i.test(result.data)) {
      svg = result.data;
    }
  } catch {
    /* keep the DOMPurify output */
  }

  // Layer 4: defense in depth.
  if (
    /<\s*script/i.test(svg) ||
    /javascript:/i.test(svg) ||
    /\son\w+\s*=/i.test(svg) ||
    /<\s*(foreignObject|iframe|embed|object|use|image)\b/i.test(svg)
  ) {
    return { ok: false, reason: "El SVG contiene contenido no permitido." };
  }

  return { ok: true, svg };
}

// Allow only single-emoji / short grapheme uploads, no markup.
export function sanitizeEmoji(raw: string): SanitizeResult {
  const value = (raw || "").trim();
  if (!value) return { ok: false, reason: "Emoji vacío." };
  if (value.length > 8 || /[<>]/.test(value)) {
    return { ok: false, reason: "Introduce un único emoji." };
  }
  return { ok: true, svg: value };
}
