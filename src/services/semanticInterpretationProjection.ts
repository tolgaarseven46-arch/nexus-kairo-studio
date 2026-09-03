import type { SemanticEvent, RelationalAct } from "./semanticEventEngine";
import type { SemanticInterpretation } from "../types/semanticInterpretation";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const INTENT_MAP: Record<SemanticInterpretation["primaryIntent"], SemanticEvent["intent"]> = {
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

function relationalAct(interp: SemanticInterpretation): RelationalAct {
  const facets = interp.discourseFacets;
  if (facets.relationalAct !== "none") return facets.relationalAct;
  if (interp.secondarySocialActs.includes("reassurance_seek")) return "reassurance_seek";
  if (interp.secondarySocialActs.includes("reconciliation")) return "reconciliation_attempt";
  if (interp.secondarySocialActs.includes("mockery")) return "mockery";
  if (interp.secondarySocialActs.includes("challenge")) return "challenge";
  if (interp.secondarySocialActs.includes("closeness_bid")) return "closeness_bid";
  if (interp.secondarySocialActs.includes("repair")) return "repair_probe";
  return "none";
}

/**
 * Deterministic compatibility projection only.
 *
 * This function MUST NOT inspect raw text, call a parser, use regex, or widen the
 * semantic reading. `SemanticInterpretation@2` is the only authority; the legacy
 * `SemanticEvent` shape exists solely for consumers not yet migrated.
 */
export function projectSemanticEvent(interp: SemanticInterpretation): SemanticEvent {
  const insult =
    interp.primaryIntent === "insult" ||
    interp.secondarySocialActs.includes("insult") ||
    interp.severity.disrespect >= 0.7;
  const redLine = interp.severity.disrespect >= 0.98;
  const frustration = clamp01(interp.severity.aggression * 0.9);
  const severity = clamp01(Math.max(
    interp.severity.disrespect,
    interp.severity.coercion * 0.85,
    interp.severity.manipulation * 0.8,
    interp.severity.privacy * 0.8,
    frustration * 0.55,
    interp.emotionalLoad * 0.45,
  ));
  const target: SemanticEvent["target"] =
    interp.target === "kaira" || interp.target === "third_party" || interp.target === "event"
      ? interp.target
      : "unknown";

  return {
    raw: interp.raw,
    normalized: interp.normalized,
    intent: INTENT_MAP[interp.primaryIntent],
    socialRoutine: interp.discourseFacets.socialRoutine,
    discourseAct: interp.discourseFacets.discourseAct,
    repairSignal: interp.discourseFacets.repairSignal,
    adviceRequested: interp.discourseFacets.adviceRequested,
    knowledgeQuery: interp.discourseFacets.knowledgeQuery,
    selfMemoryQuery: interp.discourseFacets.selfMemoryQuery,
    valence: interp.valence,
    target,
    relationalAct: relationalAct(interp),
    relationalIntensity: clamp01(interp.discourseFacets.relationalIntensity),
    severity,
    insult,
    redLine,
    disrespect: clamp01(interp.severity.disrespect),
    coercion: clamp01(interp.severity.coercion),
    manipulation: clamp01(interp.severity.manipulation),
    privacyViolation: clamp01(interp.severity.privacy),
    apology: interp.apology,
    repairAttempt: interp.repairAttempt,
    stopQuestions: interp.discourseFacets.stopQuestions,
    stopTalking: interp.discourseFacets.stopTalking,
    frustration,
    emotionalLoad: clamp01(interp.emotionalLoad),
    affection: clamp01(interp.affection),
    support: clamp01(interp.support),
    compliment: clamp01(interp.compliment),
  };
}
