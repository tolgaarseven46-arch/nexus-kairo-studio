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
  const deterministicRoutine = fallback.socialRoutine ?? "none";
  const providerRoutine = event.socialRoutine ?? "none";
  const deterministicReciprocal =
    deterministicRoutine === "how_are_you" || deterministicRoutine === "what_doing";
  const socialRoutine =
    deterministicReciprocal &&
    (providerRoutine === "none" || providerRoutine === "greeting")
      ? deterministicRoutine
      : event.socialRoutine ?? deterministicRoutine;

  return {
    ...event,
    raw: event.raw || message,
    normalized: event.normalized || fallback.normalized,
    socialRoutine,
    discourseAct: event.discourseAct ?? fallback.discourseAct ?? "none",
    repairSignal: event.repairSignal ?? fallback.repairSignal ?? "none",
    adviceRequested: event.adviceRequested ?? fallback.adviceRequested ?? false,
  };
}
