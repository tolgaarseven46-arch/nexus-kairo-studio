import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { PersonalitySituation } from "./personalityTendencyEngine";
import type { MotivationSituation } from "./motivationEngine";
import type { ValueSituation } from "./valueEngine";
import type { PreferenceSituation } from "./preferenceEngine";
import type { SocialSituation } from "./socialOrientationEngine";
import type { ExpressionSituation } from "./expressionStyleEngine";

export interface CanonicalBehaviorSituations {
  personality: PersonalitySituation;
  motivation: MotivationSituation;
  values: ValueSituation;
  preferences: PreferenceSituation;
  social: SocialSituation;
  expression: ExpressionSituation;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const max01 = (...values: number[]) => clamp01(Math.max(...values));

/**
 * Deterministic downstream projection from canonical SemanticInterpretation@2.
 *
 * This seam MUST NOT inspect raw/normalized text, call a parser, or introduce
 * lexical heuristics. Missing semantic concepts fail closed to neutral baselines
 * until they are modeled explicitly at the language-understanding boundary.
 */
export function projectCanonicalBehaviorSituations(
  interpretation: SemanticInterpretation,
): CanonicalBehaviorSituations {
  const acts = new Set(interpretation.secondarySocialActs);
  const facets = interpretation.discourseFacets;
  const severity = interpretation.severity;
  const relationalIntensity = clamp01(facets.relationalIntensity);
  const targetIsKaira = interpretation.target === "kaira";
  const dyadicDisrespect = targetIsKaira ? severity.disrespect : 0;
  const dyadicAggression = targetIsKaira ? severity.aggression : 0;
  const dyadicCoercion = targetIsKaira ? severity.coercion : 0;

  const challengeLoad = targetIsKaira && (acts.has("challenge") || facets.relationalAct === "challenge")
    ? Math.max(0.6, relationalIntensity)
    : targetIsKaira && (acts.has("mockery") || facets.relationalAct === "mockery")
      ? Math.max(0.55, relationalIntensity)
      : 0;
  const rejectionLoad = interpretation.primaryIntent === "rejection" && targetIsKaira ? 0.9 : 0;
  const complaintLoad = interpretation.primaryIntent === "complaint" && targetIsKaira ? 0.6 : 0;
  const conflict = max01(
    dyadicDisrespect,
    dyadicAggression,
    challengeLoad,
    rejectionLoad,
    complaintLoad,
    0.1,
  );
  const ambiguity = max01(interpretation.uncertainty.overall, interpretation.uncertainty.intent);
  const decisionDemand = facets.adviceRequested
    ? 0.85
    : interpretation.primaryIntent === "command"
      ? 0.75
      : interpretation.primaryIntent === "question" || interpretation.primaryIntent === "information_request"
        ? 0.45
        : 0.2;
  const correctionSignal = facets.discourseAct === "correction"
    ? 0.9
    : facets.repairSignal !== "none"
      ? 0.45
      : 0.05;

  const closenessBid = acts.has("closeness_bid") || facets.relationalAct === "closeness_bid";
  const socialOpportunity = max01(
    interpretation.affection,
    interpretation.support * 0.7,
    interpretation.compliment * 0.65,
    closenessBid ? Math.max(0.8, relationalIntensity) : 0,
    interpretation.primaryIntent === "greeting" || interpretation.primaryIntent === "smalltalk" ? 0.45 : 0,
  );
  const recognitionOpportunity = clamp01(interpretation.compliment);
  const autonomyThreat = clamp01(dyadicCoercion);
  const achievementOpportunity = facets.adviceRequested
    ? 0.55
    : interpretation.primaryIntent === "information_request"
      ? 0.35
      : 0.2;
  const influenceOpportunity = facets.adviceRequested
    ? 0.75
    : interpretation.primaryIntent === "command"
      ? 0.45
      : 0.2;

  const emotionalSeriousness = max01(
    interpretation.emotionalLoad,
    conflict * 0.8,
    interpretation.apology || interpretation.repairAttempt ? 0.65 : 0,
  );
  const playOpportunity = interpretation.primaryIntent === "banter" || acts.has("banter")
    ? 0.9
    : Math.max(0.08, interpretation.jokingConfidence);
  const intensityLevel = max01(
    interpretation.emotionalLoad * 0.8,
    severity.aggression,
    severity.disrespect * 0.75,
    severity.coercion * 0.75,
  );
  const depthOpportunity = interpretation.primaryIntent === "emotional_share"
    ? Math.max(0.65, interpretation.emotionalLoad)
    : interpretation.primaryIntent === "information_request"
      ? 0.4
      : 0.08;
  const complexityOpportunity = interpretation.primaryIntent === "information_request"
    ? 0.45
    : facets.adviceRequested
      ? 0.35
      : 0.08;

  const vulnerabilitySignal = interpretation.primaryIntent === "emotional_share"
    ? Math.max(0.7, interpretation.emotionalLoad)
    : clamp01(interpretation.emotionalLoad * 0.6);
  const challengeSignal = max01(challengeLoad, dyadicDisrespect * 0.7);
  const requestSignal = interpretation.primaryIntent === "command"
    ? 0.8
    : facets.adviceRequested
      ? 0.75
      : interpretation.primaryIntent === "question" || interpretation.primaryIntent === "information_request"
        ? 0.35
        : 0.15;
  const intimacySignal = max01(
    interpretation.affection,
    closenessBid ? Math.max(0.85, relationalIntensity) : 0,
  );

  const seriousContext = emotionalSeriousness;
  const hostileContext = max01(
    dyadicDisrespect,
    dyadicCoercion,
    dyadicAggression,
    interpretation.primaryIntent === "insult" && targetIsKaira ? 1 : 0,
  );
  const playfulContext = interpretation.primaryIntent === "banter" || acts.has("banter")
    ? 1
    : Math.max(0.25, interpretation.jokingConfidence);

  return {
    personality: {
      conflict,
      ambiguity,
      emotionalLoad: clamp01(interpretation.emotionalLoad),
      decisionDemand,
      correctionSignal,
    },
    motivation: {
      socialOpportunity,
      rejectionRisk: rejectionLoad || 0.1,
      recognitionOpportunity: recognitionOpportunity || 0.15,
      autonomyThreat: Math.max(0.1, autonomyThreat),
      achievementOpportunity,
      influenceOpportunity,
      uncertainty: Math.max(0.2, interpretation.uncertainty.overall),
      // Canonical schema does not yet model environmental instability.
      instability: 0.1,
    },
    values: {
      // These normative event concepts are not yet canonical fields. Fail closed
      // instead of reconstructing them from downstream lexical dictionaries.
      deception: 0.05,
      unfairness: 0.05,
      betrayal: 0.05,
      harm: 0.05,
      coercion: Math.max(0.05, severity.coercion),
      privacyViolation: Math.max(0.05, severity.privacy),
      disrespect: Math.max(0.05, severity.disrespect),
      irresponsibility: 0.05,
    },
    preferences: {
      // Novelty/competition are not canonical semantic concepts yet.
      noveltyOpportunity: 0.08,
      complexityOpportunity,
      intensityLevel: Math.max(0.12, intensityLevel),
      depthOpportunity,
      playOpportunity,
      competitionOpportunity: 0.08,
      emotionalSeriousness: Math.max(0.05, emotionalSeriousness),
    },
    social: {
      affiliationOpportunity: Math.max(0.15, socialOpportunity),
      vulnerabilitySignal: Math.max(0.05, vulnerabilitySignal),
      challengeSignal: Math.max(0.1, challengeSignal),
      requestSignal,
      coercionSignal: Math.max(0.05, dyadicCoercion),
      intimacySignal: Math.max(0.05, intimacySignal),
      // Betrayal is intentionally neutral until canonical semantics owns it.
      betrayalSignal: 0.05,
    },
    expression: {
      seriousContext,
      hostileContext,
      playfulContext,
    },
  };
}
