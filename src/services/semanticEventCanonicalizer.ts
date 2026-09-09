import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";
import {
  inferFallbackSelfMemoryQuery,
  normalizeSemanticSelfMemoryQuery,
} from "./kairaSelfMemoryQuery";

const normalizeSpeechSurface = (message: string) =>
  message
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const APOLOGY_CUE_RE = /(?<![\p{L}])(özür|pardon|af|pişman|üzgün)(?![\p{L}])/iu;
const ADVICE_CUE_RE = /(?<![\p{L}])(tavsiye|öneri|öner|akıl)(?![\p{L}])/iu;
const NEGATION_PARTICLE_RE = /(?<![\p{L}])(?:değil(?:im|sin|iz|siniz)?|yok)(?![\p{L}])/iu;
const NEGATED_PREDICATE_RE = /(?<![\p{L}])[\p{L}]{2,}(?:ma|me)(?:d[ıiuü](?:m|n|k|nız|niz|lar|ler)?|mış|miş|muş|müş|yor(?:um|sun|uz|sunuz|lar)?|yacak|yecek|yacağım|yeceğim|malı|meli|sın|sin)?(?![\p{L}])/iu;

const STOP_TALKING_PARAPHRASE_RE = /(?:^|[\s,;:.!?])(?:konuşmayı\s+bırak(?![\p{L}])|yeter\s+artık\s+cevap\s+verme(?![\p{L}])|bana\s+(?:bir\s+şey|bi\s+şey|birşey)\s+yazma(?![\p{L}])|çekil\s+git(?![\p{L}])|artık\s+konuşmayalım(?![\p{L}])|bitir\s+bunu(?![\p{L}])|bırak\s+beni(?![\p{L}])|seninle\s+konuşmak\s+istemiyorum\s+artık(?![\p{L}])|yeter(?:\s+artık)?)(?:$|[\s,;:.!?])/iu;

function hasAffirmativeCue(text: string, cue: RegExp): boolean {
  const flags = cue.flags.includes("g") ? cue.flags : `${cue.flags}g`;
  const matcher = new RegExp(cue.source, flags);
  const matches = [...text.matchAll(matcher)];
  if (!matches.length) return false;

  return matches.some((match) => {
    const index = match.index ?? 0;
    const start = Math.max(0, index - 28);
    const end = Math.min(text.length, index + match[0].length + 42);
    const scope = text.slice(start, end);
    return !NEGATION_PARTICLE_RE.test(scope) && !NEGATED_PREDICATE_RE.test(scope);
  });
}

function reconcileSpeechActs(message: string, event: SemanticEvent): SemanticEvent {
  const text = normalizeSpeechSurface(message);
  const apologyMentioned = APOLOGY_CUE_RE.test(text);
  const apologyAffirmed = !apologyMentioned || hasAffirmativeCue(text, APOLOGY_CUE_RE);
  const apology = event.apology && apologyAffirmed;

  const adviceMentioned = ADVICE_CUE_RE.test(text);
  const adviceRequested = Boolean(event.adviceRequested) &&
    (!adviceMentioned || hasAffirmativeCue(text, ADVICE_CUE_RE));

  const stopTalking = event.stopTalking || STOP_TALKING_PARAPHRASE_RE.test(text);
  const intent = event.intent === "apology" && !apology ? "general_chat" : event.intent;
  const relationalAct = event.relationalAct === "reconciliation_attempt" && !apology && !event.repairAttempt
    ? "none"
    : event.relationalAct;
  const valence = event.valence === "positive" && !apology && !event.repairAttempt &&
    event.support <= 0 && event.compliment <= 0 && event.affection <= 0
    ? "neutral"
    : event.valence;

  return {
    ...event,
    intent,
    relationalAct,
    relationalIntensity: relationalAct === "none" ? 0 : event.relationalIntensity,
    valence,
    apology,
    adviceRequested,
    stopTalking,
  };
}

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
  event = reconcileSpeechActs(message, event);
  const reconciledFallback = reconcileSpeechActs(message, fallback);
  const deterministicRoutine = reconciledFallback.socialRoutine ?? "none";
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
      discourseAct: event.discourseAct ?? reconciledFallback.discourseAct,
      intent: event.intent,
    });
  // A canonical self-memory query is owned by Kaira. When the legacy/fallback
  // producer left target unresolved, complete that ownership here alongside the
  // facet itself. Explicit non-Kaira targets remain authoritative and are never
  // overwritten by completion.
  const target = selfMemoryQuery && event.target === "unknown" ? "kaira" : event.target;

  return {
    ...event,
    raw: event.raw || message,
    normalized: event.normalized || reconciledFallback.normalized,
    target,
    socialRoutine,
    discourseAct: event.discourseAct ?? reconciledFallback.discourseAct ?? "none",
    repairSignal: event.repairSignal ?? reconciledFallback.repairSignal ?? "none",
    adviceRequested: event.adviceRequested ?? reconciledFallback.adviceRequested ?? false,
    knowledgeQuery,
    selfMemoryQuery,
  };
}
