import type { SemanticEvent } from "./semanticEventEngine";

export type SemanticSelfMemoryScope =
  | "self_fact"
  | "autobiographical_memory"
  | "any";

export interface SemanticSelfMemoryQuery {
  surface: string;
  scope: SemanticSelfMemoryScope;
  factKey?: string;
  confidence: number;
}

declare module "./semanticEventEngine" {
  interface SemanticEvent {
    selfMemoryQuery?: SemanticSelfMemoryQuery | null;
  }
}

const normalizeSurface = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);

const normalizeFactKey = (value?: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

export function normalizeSemanticSelfMemoryQuery(
  query?: SemanticSelfMemoryQuery | null,
): SemanticSelfMemoryQuery | null {
  if (!query) return null;
  const surface = normalizeSurface(query.surface);
  if (!surface) return null;
  const scope: SemanticSelfMemoryScope =
    query.scope === "self_fact" || query.scope === "autobiographical_memory"
      ? query.scope
      : "any";
  const factKey = normalizeFactKey(query.factKey);
  return {
    surface,
    scope,
    ...(factKey && scope !== "autobiographical_memory" ? { factKey } : {}),
    confidence: Math.max(0, Math.min(1, Number(query.confidence) || 0)),
  };
}

/**
 * Deterministic fallback at the canonical semantic boundary only.
 * Downstream consumers must not re-parse these phrases independently.
 * The fallback intentionally does not invent factKey values; exact canonical
 * keys should come from a semantic provider or another typed upstream source.
 */
export function inferFallbackSelfMemoryQuery(
  message: string,
  event: Pick<SemanticEvent, "discourseAct" | "intent">,
): SemanticSelfMemoryQuery | null {
  const text = normalizeSurface(message).toLocaleLowerCase("tr-TR");
  if (!text) return null;

  const explicitSelf = /\b(senin|seninle|sana|kendin|kendi|hayatında|geçmişinde)\b/u.test(text);
  const recallCue = /hatırlıyor musun|hatırladın mı|hatırlıyor muydun|anı(?:n|ların|larını)?|geçmiş(?:in|inde)?|başına gel|yaşadığın|yaşamış mıydın|olmuş muydu/u.test(text);
  const factCue = /en sevdiğin|sevdiğin|tercih ettiğin|favori(?:n)?|hangi .* seversin|ne seversin|neyi seversin|neye inanırsın|nasıl birisin/u.test(text);

  if (explicitSelf && factCue) {
    return { surface: normalizeSurface(message), scope: "self_fact", confidence: 0.88 };
  }
  if (explicitSelf && recallCue) {
    return {
      surface: normalizeSurface(message),
      scope: "autobiographical_memory",
      confidence: 0.9,
    };
  }
  if (explicitSelf && event.discourseAct === "recall_request") {
    return { surface: normalizeSurface(message), scope: "any", confidence: 0.8 };
  }
  return null;
}
