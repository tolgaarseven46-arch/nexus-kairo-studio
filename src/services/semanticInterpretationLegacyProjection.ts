/**
 * Bidirectional shim between the legacy single-label `SemanticEvent` and the
 * canonical `SemanticInterpretation@2` (ADR-0006).
 *
 * PR1: unwired. Exists so that, once producers emit v2, every legacy
 * `SemanticEvent` consumer keeps working by consuming a projection, and so that
 * the reducer can be fed from either side during the transition. Removed in PR5.
 *
 * The regex engine (`interpretSemanticEvent`) is the safety FLOOR: when building
 * a v2 interpretation from scratch we start from the regex reading and only widen
 * uncertainty; we never drop a regex-detected hard signal.
 */

import {
  interpretSemanticEvent,
  type SemanticEvent,
  type SemanticIntent,
} from "./semanticEventEngine";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
  type SemanticPrimaryIntent,
  type SemanticSocialAct,
  type SemanticTarget,
  type SeverityVector,
} from "../types/semanticInterpretation";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// --- context frames used to grade lexical hostility (ADR-0006 §1) -----------
const JOKE_MARKERS_RE =
  /😂|🤣|😄|😅|😆|😜|😏|:d\b|\bxd\b|(?<![\p{L}])(?:haha+|hah+|hehe+|şaka|espri|troll|gırgır|taşak)(?![\p{L}])|dalga\s*geç|takıl(?:ıyor|dım|ıyoruz|dık)/iu;
const AFFECTIONATE_FRAME_RE =
  /(?<![\p{L}])(kank[a-zçğıöşü]*|birader|moruk|kardeşim|reis|aslanım|dostum|canım|aşkım|bebeğim|bebiş|tatlım|gülüm|prensesim)(?![\p{L}])/iu;
const DIRECT_SECOND_PERSON_RE = /(?<![\p{L}])(sen|sana|seni|senin|senden|siz|sizi|sizin)(?![\p{L}])/iu;
const QUESTION_FRAME_RE =
  /[?？]|(?<![\p{L}])(mi|mı|mu|mü|misin|mısın|musun|müsün)(?![\p{L}])|değil\s*mi/iu;
const REPORTING_FRAME_RE = /(?<![\p{L}])(dedi|demiş|dedim|söyledi|söyledim|diyor|diye|anlatt)(?![\p{L}])/iu;
const VENT_FRAME_RE = /(?<![\p{L}])(amk|aq|mk|of+|off+)(?![\p{L}])|ya\s+be/iu;

// Inflection-tolerant lexical cues. `interpretSemanticEvent`'s slur/insult
// regexes are word-boundary bound and miss Turkish suffixed forms
// ("orospusun", "kaşarsın", "aptalsın"). The grader needs to see those too,
// otherwise a serious inflected insult and a banter one look identical.
const SLUR_STEM_RE = /(?<![\p{L}])(orosp|kaşa[rs]|sürtük|kahpe|yavşak|piçsin|piç\b)/iu;
const INSULT_STEM_RE =
  /(?<![\p{L}])(aptal|salak|gerizekal|geri\s*zekal|şerefsiz|haysiyetsiz|\bmal\b|ezik|köle|siktir|defol|boş\s*konuş|dangalak|gudik|öküz\b)/iu;

interface LexicalHostilityReading {
  severity: SeverityVector;
  jokingConfidence: number;
  sincerityConfidence: number;
  uncertaintyOverall: number;
  target: SemanticTarget;
}

/**
 * Grade a lexical hostility hit by CONTEXT instead of stamping it as heavy
 * insult. A single dictionary match ("kaşar", "orospu", ...) with no
 * corroborating context (no pointed 2nd-person address, joke markers,
 * affectionate framing, question framing, very short) yields only a moderate
 * `disrespect` with WIDE uncertainty — not enough to hard-stop on its own.
 * Corroboration (pointed address, sustained hostile message, repetition-context
 * upstream) raises it; joke/affection framing lowers it.
 */
function readLexicalHostility(message: string, event: SemanticEvent): LexicalHostilityReading {
  const wc = (message.trim().match(/\S+/gu) ?? []).length;
  const normalized = event.normalized || message.toLocaleLowerCase("tr-TR");
  const lexRedline = Boolean(event.redLine) || SLUR_STEM_RE.test(normalized);
  const lexInsult = (Boolean(event.insult) || INSULT_STEM_RE.test(normalized)) && !lexRedline;
  const lexCue = lexRedline || lexInsult;

  const hasJoke = JOKE_MARKERS_RE.test(message);
  const hasAffFrame = AFFECTIONATE_FRAME_RE.test(message) || (event.affection ?? 0) > 0;
  const isReporting = REPORTING_FRAME_RE.test(message);
  const directYou = DIRECT_SECOND_PERSON_RE.test(message) && !isReporting;
  const isQuestion = QUESTION_FRAME_RE.test(message);
  const isShort = wc <= 4;
  const isVent = VENT_FRAME_RE.test(message) && !directYou;

  // pointed = "sen X'sin" — 2nd person, not a question, not joking/affectionate
  const pointed = directYou && !isQuestion && !hasJoke && !hasAffFrame;
  const negative = event.valence === "negative";

  // A dictionary stem alone is not hostility. Only treat it as one when the turn
  // is negative in valence OR is a direct 2nd-person address. This keeps
  // "kaşar peyniri severim" / "mal aldım" from getting a disrespect score.
  const lexicalFloorApplies = lexCue && (negative || directYou);
  let disrespect = lexicalFloorApplies
    ? (lexRedline ? 0.6 : 0.45)
    : clamp01(event.disrespect ?? 0);
  if (pointed) disrespect += 0.25;
  else if (directYou && isQuestion) disrespect += 0.05;
  if ((event.frustration ?? 0) > 0) disrespect += 0.1;
  if (wc > 8 && negative) disrespect += 0.1;
  if (hasJoke) disrespect -= 0.22;
  if (hasAffFrame) disrespect -= 0.15;
  if (isQuestion && !pointed && lexCue) disrespect -= 0.15;
  if (isVent) disrespect -= 0.08;
  disrespect = clamp01(disrespect);

  let aggression = clamp01(
    Math.max(
      (event.frustration ?? 0) * 0.9,
      lexicalFloorApplies && lexRedline && pointed ? 0.55 : lexicalFloorApplies && lexRedline ? 0.25 : 0,
      lexicalFloorApplies && lexInsult && pointed ? 0.4 : 0,
    ),
  );
  if (hasJoke) aggression = clamp01(aggression - 0.15);

  let jokingConfidence = 0.12;
  if (hasJoke) jokingConfidence += 0.42;
  if (hasAffFrame) jokingConfidence += 0.22;
  if (lexCue && isQuestion) jokingConfidence += 0.15;
  if (lexCue && isShort && !pointed) jokingConfidence += 0.15;
  if (isVent) jokingConfidence += 0.1;
  jokingConfidence = clamp01(jokingConfidence);

  let sincerityConfidence = 0.5;
  if (pointed) sincerityConfidence += hasJoke ? 0.15 : 0.28;
  if (wc > 8 && negative) sincerityConfidence += 0.1;
  if (hasJoke) sincerityConfidence -= 0.28;
  if (hasAffFrame) sincerityConfidence -= 0.15;
  sincerityConfidence = clamp01(sincerityConfidence);

  let uncertaintyOverall = 0.5;
  if (lexCue && isShort && !pointed) uncertaintyOverall += 0.2; // one bare word, little to go on
  if (lexCue && hasJoke) uncertaintyOverall += 0.15; // mixed signals
  if (event.target === "unknown" && !pointed) uncertaintyOverall += 0.12;
  if (pointed && !hasJoke) uncertaintyOverall -= 0.22; // a pointed 2nd-person hostility is clear
  uncertaintyOverall = Math.max(0.15, Math.min(0.9, uncertaintyOverall));

  let target = targetFromLegacy(event.target);
  // Do not claim "kaira" for a bare slur with no 2nd-person and no reporting.
  if (lexCue && !directYou && !isReporting && target === "kaira") target = "unknown";
  // Do claim "kaira" for a pointed 2nd-person hostility that the regex under-targeted.
  if (lexCue && pointed && !isReporting && target !== "third_party") target = "kaira";

  return {
    severity: {
      disrespect,
      coercion: clamp01(event.coercion ?? 0),
      manipulation: clamp01(event.manipulation ?? 0),
      privacy: clamp01(event.privacyViolation ?? 0),
      aggression,
    },
    jokingConfidence,
    sincerityConfidence,
    uncertaintyOverall,
    target,
  };
}

const PRIMARY_INTENT_FROM_LEGACY: Record<SemanticIntent, SemanticPrimaryIntent> = {
  greeting: "greeting",
  question: "question",
  information_request: "information_request",
  emotional_share: "emotional_share",
  affection: "affection",
  banter: "banter",
  insult: "insult",
  rejection: "rejection",
  apology: "apology",
  repair: "repair",
  complaint: "complaint",
  command: "command",
  support: "support",
  compliment: "compliment",
  general_chat: "smalltalk",
};

const LEGACY_INTENT_FROM_PRIMARY: Record<SemanticPrimaryIntent, SemanticIntent> = {
  greeting: "greeting",
  smalltalk: "general_chat",
  question: "question",
  information_request: "information_request",
  emotional_share: "emotional_share",
  affection: "affection",
  banter: "banter",
  insult: "insult",
  rejection: "rejection",
  apology: "apology",
  repair: "repair",
  complaint: "complaint",
  command: "command",
  support: "support",
  compliment: "compliment",
  boundary_test: "complaint",
  other: "general_chat",
};

function socialActsFromLegacy(event: SemanticEvent): SemanticSocialAct[] {
  const acts = new Set<SemanticSocialAct>();
  if (event.insult || event.redLine) acts.add("insult");
  if (event.coercion > 0) acts.add("coercion");
  if (event.manipulation > 0) acts.add("manipulation");
  if (event.privacyViolation > 0) acts.add("privacy_violation");
  if (event.affection > 0) acts.add("affection");
  if (event.apology) acts.add("apology");
  if (event.repairAttempt) acts.add("repair");
  if (event.stopTalking || event.stopQuestions) acts.add("stop_request");
  if (event.intent === "banter") acts.add("banter");
  switch (event.relationalAct) {
    case "reassurance_seek":
      acts.add("reassurance_seek");
      break;
    case "reconciliation_attempt":
      acts.add("reconciliation");
      break;
    case "closeness_bid":
      acts.add("closeness_bid");
      break;
    case "mockery":
      acts.add("mockery");
      break;
    case "challenge":
      acts.add("challenge");
      break;
    case "repair_probe":
      acts.add("repair");
      break;
    default:
      break;
  }
  return Array.from(acts);
}

function targetFromLegacy(t: SemanticEvent["target"]): SemanticTarget {
  switch (t) {
    case "kaira":
      return "kaira";
    case "third_party":
      return "third_party";
    case "event":
      return "event";
    default:
      return "unknown";
  }
}

/**
 * Build a canonical interpretation from the regex engine alone (the safety
 * floor). Uncertainty is intentionally wide: the regex layer is deterministic
 * but shallow, so downstream must treat these readings as low-confidence unless
 * a reconciler later raises them.
 */
function buildInterpretation(event: SemanticEvent, message: string): SemanticInterpretation {
  const hostility = readLexicalHostility(message, event);
  const acts = socialActsFromLegacy(event);

  return normalizeSemanticInterpretation(
    {
      schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
      raw: message,
      normalized: event.normalized,
      primaryIntent: PRIMARY_INTENT_FROM_LEGACY[event.intent] ?? "other",
      secondarySocialActs: acts,
      target: hostility.target,
      valence: event.valence,
      severity: hostility.severity,
      jokingConfidence: hostility.jokingConfidence,
      sincerityConfidence: hostility.sincerityConfidence,
      affection: clamp01(event.affection ?? 0),
      support: clamp01(event.support ?? 0),
      compliment: clamp01(event.compliment ?? 0),
      emotionalLoad: clamp01(event.emotionalLoad ?? 0),
      apology: Boolean(event.apology),
      repairAttempt: Boolean(event.repairAttempt),
      stopRequest: Boolean(event.stopTalking || event.stopQuestions),
      uncertainty: {
        overall: hostility.uncertaintyOverall,
        intent: 0.5,
        target: hostility.target === "unknown" ? 0.7 : 0.4,
        severity: hostility.uncertaintyOverall,
      },
      evidence: [
        {
          source: "regex",
          provider: "interpretSemanticEvent+contextGrader",
          cues: [
            event.intent,
            event.relationalAct,
            `disrespect:${hostility.severity.disrespect.toFixed(2)}`,
            `joking:${hostility.jokingConfidence.toFixed(2)}`,
          ].filter(Boolean),
          confidence: 0.5,
        },
      ],
    },
    message,
  );
}

/**
 * Canonical interpretation from the regex engine + context grader (the safety
 * FLOOR). A lexical hostility hit is graded by context, not stamped: a bare
 * slur, a teasing question, or joke-framed harsh language stays well below the
 * hard-stop severity gate; a pointed sustained insult does not.
 */
export function interpretationFromRegexFloor(message: string): SemanticInterpretation {
  return buildInterpretation(interpretSemanticEvent(message), message);
}

/**
 * Lift an already-computed legacy SemanticEvent into a canonical interpretation.
 * In PR1 the `event` IS the regex output, so this is the context-graded floor
 * plus the event's orthogonal, context-independent signals
 * (coercion / manipulation / privacy / apology / stop / affection). It never
 * re-inflates disrespect/aggression from a naive redLine flag — those are the
 * context grader's job.
 */
export function interpretationFromLegacyEvent(
  event: SemanticEvent,
  message = event.raw,
): SemanticInterpretation {
  const base = buildInterpretation(event, message);
  return normalizeSemanticInterpretation(
    {
      ...base,
      secondarySocialActs: Array.from(
        new Set([...base.secondarySocialActs, ...socialActsFromLegacy(event)]),
      ),
      severity: {
        ...base.severity,
        coercion: Math.max(base.severity.coercion, clamp01(event.coercion ?? 0)),
        manipulation: Math.max(base.severity.manipulation, clamp01(event.manipulation ?? 0)),
        privacy: Math.max(base.severity.privacy, clamp01(event.privacyViolation ?? 0)),
      },
      affection: Math.max(base.affection, clamp01(event.affection ?? 0)),
      support: Math.max(base.support, clamp01(event.support ?? 0)),
      compliment: Math.max(base.compliment, clamp01(event.compliment ?? 0)),
      emotionalLoad: Math.max(base.emotionalLoad, clamp01(event.emotionalLoad ?? 0)),
      apology: base.apology || Boolean(event.apology),
      repairAttempt: base.repairAttempt || Boolean(event.repairAttempt),
      stopRequest: base.stopRequest || Boolean(event.stopTalking || event.stopQuestions),
    },
    message,
  );
}

/**
 * Project a canonical interpretation DOWN to the legacy SemanticEvent shape so
 * existing consumers (semanticIntentToKdm, isSemanticEvent, dialogue projection,
 * ...) keep working unchanged. Safety fields use the max of the interpretation
 * and the regex floor so a downgrade can never drop a hard signal.
 */
export function projectLegacySemanticEvent(
  interp: SemanticInterpretation,
  message = interp.raw,
): SemanticEvent {
  const floor = interpretSemanticEvent(message);
  const redLine = floor.redLine || interp.severity.disrespect >= 0.98;
  const insult =
    redLine ||
    floor.insult ||
    interp.primaryIntent === "insult" ||
    interp.secondarySocialActs.includes("insult") ||
    interp.severity.disrespect >= 0.7;

  const coercion = Math.max(floor.coercion, interp.severity.coercion);
  const manipulation = Math.max(floor.manipulation, interp.severity.manipulation);
  const privacyViolation = Math.max(floor.privacyViolation, interp.severity.privacy);
  const disrespect = Math.max(floor.disrespect, interp.severity.disrespect, redLine ? 1 : insult ? 0.9 : 0);
  const frustration = Math.max(floor.frustration, interp.severity.aggression * 0.9);
  const severity = Math.max(
    floor.severity,
    disrespect,
    coercion * 0.85,
    manipulation * 0.8,
    privacyViolation * 0.8,
    frustration * 0.55,
  );

  return {
    ...floor,
    intent: LEGACY_INTENT_FROM_PRIMARY[interp.primaryIntent] ?? floor.intent,
    target:
      interp.target === "self"
        ? "kaira"
        : interp.target === "kaira" || interp.target === "third_party" || interp.target === "event"
          ? interp.target
          : floor.target,
    valence: interp.valence,
    severity: Math.min(1, severity),
    insult,
    redLine,
    disrespect: Math.min(1, disrespect),
    coercion: Math.min(1, coercion),
    manipulation: Math.min(1, manipulation),
    privacyViolation: Math.min(1, privacyViolation),
    frustration: Math.min(1, frustration),
    apology: floor.apology || interp.apology,
    repairAttempt: floor.repairAttempt || interp.repairAttempt,
    stopTalking: floor.stopTalking || (interp.stopRequest && /sus|konuşma|kes/iu.test(message)),
    stopQuestions: floor.stopQuestions || (interp.stopRequest && /sor/iu.test(message)),
    affection: Math.max(floor.affection, interp.affection),
    support: Math.max(floor.support, interp.support),
    compliment: Math.max(floor.compliment, interp.compliment),
    emotionalLoad: Math.max(floor.emotionalLoad, interp.emotionalLoad),
  };
}
