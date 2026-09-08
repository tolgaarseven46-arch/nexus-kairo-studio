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
   * Runtime projection after deterministic entity/world grounding. G4 remains the
   * magnitude authority; grounding may only veto a dyadic relationship projection
   * when the canonical grounded scope is explicitly third-party/event-facing.
   */
  runtimeAppraisal: SocialAppraisalResult;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

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
  );
  return {
    ...resolved,
    runtimeAppraisal: relationshipScopeGate(resolved.appraisal, input.relationshipScope),
  };
}

function scaleSeverity(
  severity: RelationshipTurnSignal["severity"],
  factor: number,
): RelationshipTurnSignal["severity"] {
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
 * The reducer may transition relationship state, but it no longer chooses the
 * event's relational direction or context magnitude itself.
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
  const dyadic =
    !thirdParty &&
    (interp.target === "kaira" || questionOnlyStopAddressesInterlocutor);

  const relationalMaterial = dyadic && appraisal.relational.significance > 0;
  const harmMaterial = relationalMaterial && appraisal.relational.harmEvidence > 0;
  const repairMaterial = relationalMaterial && appraisal.relational.repairEvidence > 0;
  const affiliationMaterial =
    relationalMaterial &&
    appraisal.relational.valence === "positive" &&
    !harmMaterial &&
    !repairMaterial;

  // A hard boundary is a canonical policy fact, not a tolerance-sensitive injury
  // magnitude. Ordinary relationship injury uses the bounded G4 harm factor.
  const severityFactor = interp.redLine
    ? 1
    : harmMaterial
      ? resolution.contextFactors.relationalHarm
      : 0;

  const affiliationFactor = affiliationMaterial
    ? resolution.contextFactors.relationalAffiliation
    : 0;
  const repairFactor = repairMaterial
    ? resolution.contextFactors.relationalRepair
    : 0;

  return {
    valence: relationalMaterial ? appraisal.relational.valence : "neutral",
    targetsKaira: dyadic,
    severity: scaleSeverity(relationshipSeverityForInterpretation(interp), severityFactor),
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
 * Constants deliberately reuse the canonical reducer's existing per-turn affect
 * cap; this seam changes authority, not the global affect scale.
 */
export function affectDeltaFromRuntimeAppraisal(
  fallback: Readonly<RelationshipAffect>,
  appraisal: Readonly<SocialAppraisalResult>,
  reactionMode: AffectiveReactionMode,
): RelationshipAffect {
  if (appraisal.affective.significance <= 0 || appraisal.affective.valence === "neutral") {
    return { ...fallback };
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
    anger: Math.min(0, fallback.anger),
  };
}
