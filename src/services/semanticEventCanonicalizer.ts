import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";
import {
  inferFallbackSelfMemoryQuery,
  normalizeSemanticSelfMemoryQuery,
} from "./kairaSelfMemoryQuery";

/**
 * Completes consumer-facing semantic facets at the single language-understanding
 * boundary. Providers and older clients may omit newly introduced optional
 * facets; downstream consumers must not compensate by re-parsing independently.
 */
export function canonicalizeSemanticEvent(
  message: string,
  event: SemanticEvent,
): SemanticEvent {
  const fallback = interpretSemanticEvent(message);
  const deterministicRoutine = fallback.socialRoutine ?? "none";
  const providerRoutine = event.socialRoutine ?? "none";
  const deterministicReciprocal =
    deterministicRoutine === "how_are_you" || deterministicRoutine === "what_doing";
  const socialRoutine =
    deterministicReciprocal &&
    (providerRoutine === "none" || providerRoutine === "greeting")
      ? deterministicRoutine
      : event.socialRoutine ?? deterministicRoutine;
  const knowledgeQuery = event.knowledgeQuery
    ? {
        surface: event.knowledgeQuery.surface.trim().replace(/\s+/g, " ").slice(0, 96),
        ...(event.knowledgeQuery.conceptId
          ? { conceptId: event.knowledgeQuery.conceptId.trim().replace(/\s+/g, " ").slice(0, 96) }
          : {}),
        confidence: Math.max(0, Math.min(1, event.knowledgeQuery.confidence)),
      }
    : null;
  const selfMemoryQuery =
    normalizeSemanticSelfMemoryQuery(event.selfMemoryQuery) ??
    inferFallbackSelfMemoryQuery(message, {
      discourseAct: event.discourseAct ?? fallback.discourseAct,
      intent: event.intent,
    });

  return {
    ...event,
    raw: event.raw || message,
    normalized: event.normalized || fallback.normalized,
    socialRoutine,
    discourseAct: event.discourseAct ?? fallback.discourseAct ?? "none",
    repairSignal: event.repairSignal ?? fallback.repairSignal ?? "none",
    adviceRequested: event.adviceRequested ?? fallback.adviceRequested ?? false,
    knowledgeQuery,
    selfMemoryQuery,
  };
}
