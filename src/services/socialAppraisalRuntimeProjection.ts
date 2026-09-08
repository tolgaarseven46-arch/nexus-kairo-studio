import type { AffectiveReactionMode, DroitDynamicState, DroitPersonalityTraits, RelationshipState } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { SocialAppraisalResult } from "../types/socialAppraisal";
import type { SemanticRelationshipScope } from "./languageUnderstandingService";
import { resolveSocialAppraisalG4, type SocialAppraisalResolutionG4 } from "./socialAppraisalContextModulation";
import type { RelationshipAffect, RelationshipTurnSignal } from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import { relationshipSeverityForInterpretation } from "./kairaQuestionOnlyStopRelationshipPolicy";

export interface RuntimeSocialAppraisalInput {
  semantic: SemanticInterpretation;
  relationshipScope?: SemanticRelationshipScope;
  relationship: Readonly<RelationshipState>;
  currentState: Readonly<DroitDynamicState>;
  personality: Readonly<DroitPersonalityTraits>;
}

export interface RuntimeSocialAppraisalResolution extends SocialAppraisalResolutionG4 {
  /**
   * Runtime projection after deterministic entity/world grounding. G4 owns
   * relational direction/materiality and bounded context modulation; grounding
   * may resolve an unknown target to the active dyad or veto a projection for
   * explicit third-party/event scope, but it cannot override an explicit
   * semantic self/third-party/event target.
   */
  runtimeAppraisal: SocialAppraisalResult;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const ZERO_AFFECT: RelationshipAffect = { anger: 0, stress: 0, happiness: 0, calmness: 0 };

function relationshipScopeGate(
  appraisal: Readonly<SocialAppraisalResult>,
  scope?: SemanticRelationshipScope,
): SocialAppraisalResult {
  if (scope !== "third_party" && scope !== "event") return { ...appraisal };
  const relational = {
    ...appraisal.relational,
    valence: "neutral" as const,
    significance: 0,
    harmEvidence: 0,
    repairEvidence: 0,
  };
  return {
    ...appraisal,
    relational,
    noMaterialEffect: appraisal.affective.significance <= 0,
    reasons: [...appraisal.reasons, `runtime_scope_gate:${scope}`],
  };
}

/** Resolve G4 exactly once for the runtime turn, then apply only typed grounding gates. */
export function resolveRuntimeSocialAppraisal(
  input: Readonly<RuntimeSocialAppraisalInput>,
): RuntimeSocialAppraisalResolution {
  const resolved = resolveSocialAppraisalG4(
    {
      semantic: input.semantic,
      relationship: input.relationship,
      currentState: input.currentState,
      personality: input.personality,
    },
    "active-interlocutor",
    input.relationshipScope,
  );
  return {
    ...resolved,
    runtimeAppraisal: relationshipScopeGate(resolved.appraisal, input.relationshipScope),
  };
}

function maxSeverity(severity: RelationshipTurnSignal["severity"]): number {
  return Math.max(
    severity.disrespect,
    severity.coercion,
    severity.manipulation,
    severity.privacy,
    severity.aggression,
  );
}

function projectSeverityMagnitude(
  severity: RelationshipTurnSignal["severity"],
  targetMagnitude: number,
): RelationshipTurnSignal["severity"] {
  const sourceMagnitude = maxSeverity(severity);
  if (sourceMagnitude <= 0 || targetMagnitude <= 0) {
    return { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };
  }
  const factor = clamp01(targetMagnitude) / sourceMagnitude;
  return {
    disrespect: clamp01(severity.disrespect * factor),
    coercion: clamp01(severity.coercion * factor),
    manipulation: clamp01(severity.manipulation * factor),
    privacy: clamp01(severity.privacy * factor),
    aggression: clamp01(severity.aggression * factor),
  };
}

/**
 * Project canonical G4 relational meaning into the legacy reducer signal shape.
 * Candidate-reading plausibility is evidence for appraisal direction/materiality,
 * not a severity magnitude. Canonical severity owns the harm-vector magnitude;
 * G4 owns its bounded contextual modulation. This prevents a low canonical
 * severity from being inflated by a candidate's non-probabilistic plausibility.
 */
export function relationshipSignalFromRuntimeAppraisal(
  interp: SemanticInterpretation,
  relationshipScope: SemanticRelationshipScope | undefined,
  negativePattern: string | null,
  resolution: Readonly<RuntimeSocialAppraisalResolution>,
): RelationshipTurnSignal {
  const appraisal = resolution.runtimeAppraisal;
  const thirdParty = relationshipScope === "third_party" || relationshipScope === "event";
  const questionOnlyStopAddressesInterlocutor =
    interp.discourseFacets.stopQuestions === true &&
    interp.discourseFacets.stopTalking === false &&
    interp.stopRequest === false;
  const groundedUnknownTargetAddressesInterlocutor =
    interp.target === "unknown" && relationshipScope === "kaira_user";
  const dyadic =
    !thirdParty &&
    (interp.target === "kaira" ||
      groundedUnknownTargetAddressesInterlocutor ||
      questionOnlyStopAddressesInterlocutor);

  const relationalMaterial = dyadic && appraisal.relational.significance > 0;
  const harmMaterial = relationalMaterial && appraisal.relational.harmEvidence > 0;
  const repairMaterial = relationalMaterial && appraisal.relational.repairEvidence > 0;
  const affiliationMaterial =
    relationalMaterial &&
    appraisal.relational.valence === "positive" &&
    !harmMaterial &&
    !repairMaterial;

  const baseSeverity = relationshipSeverityForInterpretation(interp);
  const baseHarmMagnitude = maxSeverity(baseSeverity);
  const hardSeverityCandidate =
    baseHarmMagnitude >= DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.minPresentSeverity;
  const projectedHarmMagnitude = harmMaterial
    ? hardSeverityCandidate
      ? baseHarmMagnitude
      : clamp01(baseHarmMagnitude * resolution.contextFactors.relationalHarm)
    : 0;

  const affiliationFactor = affiliationMaterial
    ? resolution.contextFactors.relationalAffiliation
    : 0;

  return {
    valence: relationalMaterial ? appraisal.relational.valence : "neutral",
    targetsKaira: dyadic,
    severity: projectSeverityMagnitude(baseSeverity, projectedHarmMagnitude),
    jokingConfidence: interp.jokingConfidence,
    sincerityConfidence: interp.sincerityConfidence,
    apology: repairMaterial && interp.apology,
    repairAttempt: repairMaterial && interp.repairAttempt,
    support: affiliationMaterial ? clamp01(interp.support * affiliationFactor) : 0,
    compliment: affiliationMaterial ? clamp01(interp.compliment * affiliationFactor) : 0,
    affection: affiliationMaterial ? clamp01(interp.affection * affiliationFactor) : 0,
    userStop: dyadic ? interp.stopRequest : false,
    uncertainty: interp.uncertainty.overall,
    negativePattern: harmMaterial ? negativePattern : null,
  };
}

/**
 * Convert G4's independent affective projection into state-transition deltas.
 * Exact-zero stays exact-zero: legacy reducer affect is intentionally ignored as
 * a fallback because that would create a second affective authority.
 */
export function affectDeltaFromRuntimeAppraisal(
  _legacyFallback: Readonly<RelationshipAffect>,
  appraisal: Readonly<SocialAppraisalResult>,
  reactionMode: AffectiveReactionMode,
): RelationshipAffect {
  if (appraisal.affective.significance <= 0 || appraisal.affective.valence === "neutral") {
    return { ...ZERO_AFFECT };
  }

  const magnitude = clamp01(
    appraisal.affective.significance * (0.5 + appraisal.affective.activation * 0.5),
  );
  const cap = DEFAULT_RELATIONSHIP_REDUCER_CONFIG.affect.irritatedMaxStressPerTurn;
  const scaled = Math.max(1, Math.round(cap * magnitude));

  if (appraisal.affective.valence === "negative") {
    const angerFactor = reactionMode === "irritated" ? 1 : 0.35;
    return {
      stress: scaled,
      happiness: -Math.round(scaled * 0.75),
      calmness: -Math.round(scaled * 0.5),
      anger: Math.round(scaled * angerFactor),
    };
  }

  return {
    stress: -Math.max(1, Math.round(scaled * 0.5)),
    happiness: Math.max(1, Math.round(scaled * 0.5)),
    calmness: Math.max(1, Math.round(scaled * 0.25)),
    anger: 0,
  };
}
