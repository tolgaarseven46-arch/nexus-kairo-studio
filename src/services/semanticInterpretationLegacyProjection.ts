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

function severityFromLegacy(event: SemanticEvent): SeverityVector {
  return {
    disrespect: clamp01(event.disrespect ?? (event.redLine ? 1 : event.insult ? 0.9 : 0)),
    coercion: clamp01(event.coercion ?? 0),
    manipulation: clamp01(event.manipulation ?? 0),
    privacy: clamp01(event.privacyViolation ?? 0),
    aggression: clamp01(Math.max(event.frustration ?? 0, event.insult ? 0.6 : 0, event.redLine ? 0.85 : 0)),
  };
}

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
export function interpretationFromRegexFloor(message: string): SemanticInterpretation {
  const event = interpretSemanticEvent(message);
  const severity = severityFromLegacy(event);
  const acts = socialActsFromLegacy(event);
  const jokingConfidence = /(😂|🤣|😄|😅|:d|haha|hahah)/iu.test(message) ? 0.45 : 0.15;

  return normalizeSemanticInterpretation(
    {
      schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
      raw: message,
      normalized: event.normalized,
      primaryIntent: PRIMARY_INTENT_FROM_LEGACY[event.intent] ?? "other",
      secondarySocialActs: acts,
      target: targetFromLegacy(event.target),
      valence: event.valence,
      severity,
      jokingConfidence,
      // Regex cannot really judge sincerity; stay agnostic.
      sincerityConfidence: 0.5,
      affection: clamp01(event.affection ?? 0),
      support: clamp01(event.support ?? 0),
      compliment: clamp01(event.compliment ?? 0),
      emotionalLoad: clamp01(event.emotionalLoad ?? 0),
      apology: Boolean(event.apology),
      repairAttempt: Boolean(event.repairAttempt),
      stopRequest: Boolean(event.stopTalking || event.stopQuestions),
      uncertainty: {
        overall: 0.55,
        intent: 0.5,
        target: event.target === "unknown" ? 0.7 : 0.45,
        severity: 0.5,
      },
      evidence: [
        {
          source: "regex",
          provider: "interpretSemanticEvent",
          cues: [event.intent, event.relationalAct, `sev:${severity.disrespect.toFixed(2)}`].filter(Boolean),
          confidence: 0.5,
        },
      ],
    },
    message,
  );
}

/** Lift an already-computed legacy SemanticEvent into a canonical interpretation. */
export function interpretationFromLegacyEvent(
  event: SemanticEvent,
  message = event.raw,
): SemanticInterpretation {
  const floor = interpretationFromRegexFloor(message);
  const severity = severityFromLegacy(event);
  return normalizeSemanticInterpretation(
    {
      ...floor,
      primaryIntent: PRIMARY_INTENT_FROM_LEGACY[event.intent] ?? floor.primaryIntent,
      secondarySocialActs: Array.from(new Set([...floor.secondarySocialActs, ...socialActsFromLegacy(event)])),
      target: targetFromLegacy(event.target),
      valence: event.valence,
      severity: {
        disrespect: Math.max(floor.severity.disrespect, severity.disrespect),
        coercion: Math.max(floor.severity.coercion, severity.coercion),
        manipulation: Math.max(floor.severity.manipulation, severity.manipulation),
        privacy: Math.max(floor.severity.privacy, severity.privacy),
        aggression: Math.max(floor.severity.aggression, severity.aggression),
      },
      affection: Math.max(floor.affection, clamp01(event.affection ?? 0)),
      support: Math.max(floor.support, clamp01(event.support ?? 0)),
      compliment: Math.max(floor.compliment, clamp01(event.compliment ?? 0)),
      emotionalLoad: Math.max(floor.emotionalLoad, clamp01(event.emotionalLoad ?? 0)),
      apology: floor.apology || Boolean(event.apology),
      repairAttempt: floor.repairAttempt || Boolean(event.repairAttempt),
      stopRequest: floor.stopRequest || Boolean(event.stopTalking || event.stopQuestions),
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
