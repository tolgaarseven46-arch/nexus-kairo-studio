import type { SemanticEvent } from "./semanticEventEngine";

export type SemanticSelfMemoryScope =
  | "self_fact"
  | "autobiographical_memory"
  | "any";
export type SemanticSelfMemoryRetrievalMode = "targeted" | "broad";

export interface SemanticSelfMemoryQuery {
  surface: string;
  scope: SemanticSelfMemoryScope;
  factKey?: string;
  retrievalMode?: SemanticSelfMemoryRetrievalMode;
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
  const retrievalMode: SemanticSelfMemoryRetrievalMode =
    query.retrievalMode === "broad" ? "broad" : "targeted";
  return {
    surface,
    scope,
    ...(factKey && scope !== "autobiographical_memory" ? { factKey } : {}),
    ...(scope !== "self_fact" ? { retrievalMode } : {}),
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
  const surface = normalizeSurface(message);
  const text = surface.toLocaleLowerCase("tr-TR");
  if (!text) return null;

  const userSelf = /\b(ben|benim|bana|beni)\b/u.test(text);
  const explicitKairaSelf = /\b(senin|seninle|kendin|kendi|hayatında|geçmişinde)\b/u.test(text);
  if (userSelf && !/\bsenin\b/u.test(text)) return null;

  const recallCue = /hatırlıyor musun|hatırladın mı|hatırlıyor muydun|anı(?:n|ların|larını)?|geçmiş(?:in|inde)?|başına gel|yaşadığın|yaşamış mıydın|olmuş muydu/u.test(text);
  const broadRecallCue = /(?:geçmişinde|hayatında) (?:neler|ne) (?:yaşadın|oldu)|(?:en önemli|unutamadığın) anı(?:n)?|başına (?:neler|ne) geldi|anıların neler/u.test(text);
  const factCue = /en sevdiğin|sevdiğin|tercih ettiğin|favori(?:n)?|hangi .* seversin|ne seversin|neyi seversin|ne(?:yi)? tercih edersin|neye inanırsın|nasıl birisin/u.test(text);
  const directKairaFactQuestion = /\bsen\b/u.test(text) && factCue;

  if ((explicitKairaSelf || directKairaFactQuestion) && factCue) {
    return { surface, scope: "self_fact", confidence: 0.88 };
  }
  if (explicitKairaSelf && recallCue) {
    return {
      surface,
      scope: "autobiographical_memory",
      retrievalMode: broadRecallCue ? "broad" : "targeted",
      confidence: 0.9,
    };
  }
  if (explicitKairaSelf && event.discourseAct === "recall_request") {
    return { surface, scope: "any", retrievalMode: "targeted", confidence: 0.8 };
  }
  return null;
}
