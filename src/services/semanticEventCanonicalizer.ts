import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";

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

  return {
    ...event,
    raw: event.raw || message,
    normalized: event.normalized || fallback.normalized,
    socialRoutine: event.socialRoutine ?? fallback.socialRoutine ?? "none",
    discourseAct: event.discourseAct ?? fallback.discourseAct ?? "none",
    adviceRequested: event.adviceRequested ?? fallback.adviceRequested ?? false,
  };
}
