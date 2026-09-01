import {
  interpretSemanticEvent,
  type SemanticEvent,
  type SemanticIntent,
  type SemanticTarget,
  type SemanticValence,
  type SemanticSocialRoutine,
  type SemanticDiscourseAct,
} from "./semanticEventEngine";

export type SemanticEventSource = "client_shared" | "server_recomputed";

export interface CanonicalSemanticEvent {
  event: SemanticEvent;
  source: SemanticEventSource;
}

const INTENTS = new Set<SemanticIntent>([
  "greeting",
  "question",
  "information_request",
  "emotional_share",
  "affection",
  "banter",
  "insult",
  "rejection",
  "apology",
  "repair",
  "complaint",
  "command",
  "support",
  "compliment",
  "general_chat",
]);

const SOCIAL_ROUTINES = new Set<SemanticSocialRoutine>(["none", "greeting", "how_are_you", "what_doing", "thanks", "agreement", "goodbye", "good_night", "emotional_opening"]);
const DISCOURSE_ACTS = new Set<SemanticDiscourseAct>(["none", "correction", "topic_shift", "recall_request", "confusion_or_challenge"]);
const VALENCES = new Set<SemanticValence>(["positive", "negative", "neutral"]);
const TARGETS = new Set<SemanticTarget>(["kaira", "third_party", "event", "unknown"]);

const finite01 = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const validKnowledgeQuery = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (!value || typeof value !== "object") return false;
  const query = value as Record<string, unknown>;
  return (
    typeof query.surface === "string" &&
    query.surface.trim().length > 0 &&
    query.surface.trim().length <= 96 &&
    (query.conceptId === undefined ||
      (typeof query.conceptId === "string" && query.conceptId.trim().length > 0 && query.conceptId.trim().length <= 96)) &&
    finite01(query.confidence)
  );
};

/**
 * The trust boundary for semantic interpretation.
 *
 * A valid event produced by the client is reused as-is by downstream layers.
 * If it is absent or malformed, the server may recompute exactly once and mark
 * the source explicitly. Consumers must not silently reinterpret the message.
 */
export function isSemanticEvent(value: unknown): value is SemanticEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;

  return (
    typeof event.raw === "string" &&
    typeof event.normalized === "string" &&
    INTENTS.has(event.intent as SemanticIntent) &&
    (event.socialRoutine === undefined || SOCIAL_ROUTINES.has(event.socialRoutine as SemanticSocialRoutine)) &&
    (event.discourseAct === undefined || DISCOURSE_ACTS.has(event.discourseAct as SemanticDiscourseAct)) &&
    (event.adviceRequested === undefined || typeof event.adviceRequested === "boolean") &&
    validKnowledgeQuery(event.knowledgeQuery) &&
    VALENCES.has(event.valence as SemanticValence) &&
    TARGETS.has(event.target as SemanticTarget) &&
    finite01(event.severity) &&
    typeof event.insult === "boolean" &&
    typeof event.redLine === "boolean" &&
    finite01(event.disrespect) &&
    finite01(event.coercion) &&
    finite01(event.manipulation) &&
    finite01(event.privacyViolation) &&
    typeof event.apology === "boolean" &&
    typeof event.repairAttempt === "boolean" &&
    typeof event.stopQuestions === "boolean" &&
    typeof event.stopTalking === "boolean" &&
    finite01(event.frustration) &&
    finite01(event.emotionalLoad) &&
    finite01(event.affection) &&
    finite01(event.support) &&
    finite01(event.compliment)
  );
}

export function resolveCanonicalSemanticEvent(
  userMessage: string,
  incoming?: unknown,
): CanonicalSemanticEvent {
  if (isSemanticEvent(incoming)) {
    return { event: incoming, source: "client_shared" };
  }

  return {
    event: interpretSemanticEvent(userMessage),
    source: "server_recomputed",
  };
}
