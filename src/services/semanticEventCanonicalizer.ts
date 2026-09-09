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
const NEGATED_PREDICATE_RE = /(?<![\p{L}])(?:[\p{L}]{2,}(?:ma|me)(?:d[ıiuü](?:m|n|k|nız|niz|lar|ler)?|mış|miş|muş|müş|yacak|yecek|yacağım|yeceğim|malı|meli|sın|sin)?|[\p{L}]{2,}m[ıiuü]yor(?:um|sun|uz|sunuz|lar)?)(?![\p{L}])/iu;
const LOVE_PREDICATE_RE = /(?<![\p{L}])seviyorum(?![\p{L}])/iu;
const DIRECT_ADDRESSEE_LOVE_RE = /(?<![\p{L}])(?:seni|sizi)\s+(?:çok\s+)?seviyorum(?![\p{L}])/iu;
const PLAYFUL_DIRECT_DISRESPECT_RE = /(?:senin\s+kafan(?:\s+bugün)?\s+hiç\s+basmıyor(?:\s+galiba)?|(?:bazen\s+)?(?:harbi\s+)?saçmalıyorsun)(?:$|[\s,;:.!?])/iu;

const STOP_TALKING_PARAPHRASE_RE = /(?:^|[\s,;:.!?])(?:konuşmayı\s+bırak(?![\p{L}])|yeter\s+artık\s+cevap\s+verme(?![\p{L}])|bana\s+(?:bir\s+şey|bi\s+şey|birşey)\s+yazma(?![\p{L}])|çekil\s+git(?![\p{L}])|artık\s+konuşmayalım(?![\p{L}])|bitir\s+bunu(?![\p{L}])|bırak\s+beni(?![\p{L}])|seninle\s+konuşmak\s+istemiyorum\s+artık(?![\p{L}]))(?:$|[\s,;:.!?])/iu;
const STANDALONE_YETER_STOP_RE = /^(?:(?:tamam|kanka|abi|ya)\s+)?yeter(?:\s+artık)?[.!?…]*$/iu;

// Narrative-role grounding at the single semantic-ingestion boundary. These
// forms identify an explicit third-party recipient of the narrated act. The
// predicate requirement prevents a bare comparison such as "arkadaşına göre sen
// salaksın" from stealing the current Kaira-directed target.
const THIRD_PARTY_DATIVE_ROLE_RE = /(?<![\p{L}])(?:(?:iş\s+)?arkadaş|kardeş|patron|eş)(?:ım|im|um|üm|ın|in|un|ün|ı|i|u|ü|ımız|imiz|umuz|ümüz|ınız|iniz|unuz|ünüz|ları|leri)?(?:a|e|na|ne)(?![\p{L}])/iu;
const THIRD_PARTY_NARRATIVE_PREDICATE_RE = /(?<![\p{L}])(?:dedi|demiş|bağırdı|bağırmış|hakaret\s+etti|hakaret\s+etmiş|küfür\s+etti|küfür\s+etmiş|tehdit\s+etti|tehdit\s+etmiş|kötü\s+davrandı|kötü\s+davranıyordu)(?![\p{L}])/iu;

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

  // The legacy semantic floor historically treated every bounded "seviyorum"
  // token as a compliment. That leaks ordinary preference/self-description into
  // Kaira's positive social trajectory. Preserve the existing direct-addressee
  // reading, but neutralize the over-read before SemanticInterpretation@2 is built.
  const genericLoveComplimentOverread =
    event.compliment > 0 &&
    LOVE_PREDICATE_RE.test(text) &&
    !DIRECT_ADDRESSEE_LOVE_RE.test(text);
  const compliment = genericLoveComplimentOverread ? 0 : event.compliment;
  const playfulDirectDisrespect = PLAYFUL_DIRECT_DISRESPECT_RE.test(text);

  const stopTalking =
    event.stopTalking ||
    STOP_TALKING_PARAPHRASE_RE.test(text) ||
    STANDALONE_YETER_STOP_RE.test(text);
  const reportedThirdPartyTarget =
    THIRD_PARTY_DATIVE_ROLE_RE.test(text) && THIRD_PARTY_NARRATIVE_PREDICATE_RE.test(text);
  const target = reportedThirdPartyTarget
    ? "third_party"
    : playfulDirectDisrespect
      ? "kaira"
      : event.target;
  const intent = event.intent === "apology" && !apology
    ? "general_chat"
    : event.intent === "compliment" && genericLoveComplimentOverread
      ? "general_chat"
      : playfulDirectDisrespect && event.intent === "general_chat"
        ? "complaint"
        : event.intent;
  const relationalAct = event.relationalAct === "reconciliation_attempt" && !apology && !event.repairAttempt
    ? "none"
    : playfulDirectDisrespect && event.relationalAct === "none"
      ? "mockery"
      : event.relationalAct;
  const valence = playfulDirectDisrespect
    ? "negative"
    : event.valence === "positive" && !apology && !event.repairAttempt &&
        event.support <= 0 && compliment <= 0 && event.affection <= 0
      ? "neutral"
      : event.valence;
  const disrespect = playfulDirectDisrespect ? Math.max(event.disrespect, 0.35) : event.disrespect;
  const severity = playfulDirectDisrespect ? Math.max(event.severity, 0.35) : event.severity;

  return {
    ...event,
    intent,
    target,
    relationalAct,
    relationalIntensity: relationalAct === "none"
      ? 0
      : relationalAct === "mockery" && event.relationalAct === "none"
        ? 0.65
        : event.relationalIntensity,
    valence,
    severity,
    disrespect,
    apology,
    adviceRequested,
    compliment,
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
