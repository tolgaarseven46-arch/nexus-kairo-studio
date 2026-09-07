import type { RelationshipState } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import {
  computeExpectedness,
  type AppraisalContextObservation,
} from "./appraisalEngine";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Canonical semantic-evidence credibility for relationship harm.
 * Extracted from the legacy KDM bridge without changing its math.
 */
export function socialRelationshipHarmConfidence(
  interp: SemanticInterpretation,
): number {
  const rl = DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline;
  return clamp01(
    (1 - rl.jokingDampen * interp.jokingConfidence * (1 - interp.sincerityConfidence)) *
      (1 - rl.uncertaintyDampen * interp.uncertainty.overall),
  );
}

/**
 * Stable negative-pattern appraisal derived only from canonical v2 fields.
 * No raw-text inspection is permitted here.
 */
export function socialNegativePattern(
  interp: SemanticInterpretation,
): string | null {
  const explicitInsultOrMockery =
    interp.primaryIntent === "insult" ||
    interp.secondarySocialActs.includes("insult") ||
    interp.secondarySocialActs.includes("mockery");

  if (interp.primaryIntent === "complaint" && !explicitInsultOrMockery) return null;

  const harmConfidence = socialRelationshipHarmConfidence(interp);
  const contextualSeverity = {
    disrespect: interp.severity.disrespect * harmConfidence,
    coercion: interp.severity.coercion * harmConfidence,
    aggression: interp.severity.aggression * harmConfidence,
    manipulation: interp.severity.manipulation * harmConfidence,
    privacy: interp.severity.privacy * harmConfidence,
  };
  const rawMaxSeverity = Math.max(
    interp.severity.disrespect,
    interp.severity.coercion,
    interp.severity.aggression,
    interp.severity.manipulation,
    interp.severity.privacy,
  );
  const contextualMaxSeverity = Math.max(
    contextualSeverity.disrespect,
    contextualSeverity.coercion,
    contextualSeverity.aggression,
    contextualSeverity.manipulation,
    contextualSeverity.privacy,
  );

  if (contextualSeverity.privacy >= 0.15 || interp.secondarySocialActs.includes("privacy_violation")) return "mahremiyet_ihlali";
  if (contextualSeverity.manipulation >= 0.15 || interp.secondarySocialActs.includes("manipulation")) return "manipulasyon";
  if (contextualSeverity.coercion >= 0.15 || interp.secondarySocialActs.includes("coercion")) return "zorlama";
  if (explicitInsultOrMockery) return rawMaxSeverity >= 0.75 ? "agir_hakaret" : "hakaret";
  if (contextualSeverity.disrespect >= 0.15) return contextualMaxSeverity >= 0.75 ? "agir_hakaret" : "hakaret";
  if (interp.primaryIntent === "rejection") return "kovma_ve_reddetme";
  if (contextualSeverity.aggression >= 0.2) return "agresif_dil";
  return null;
}

export interface RelationshipContextAppraisal {
  familiarity: number;
  interactionFamiliarity: number;
  warmth: number;
  trust: number;
  conflict: number;
  hurt: number;
  repair: number;
  historyQuality: number;
  closeness: number;
  establishedRelationship: boolean;
  friendlyRelationship: boolean;
  damagedRelationship: boolean;
  severelyDamagedRelationship: boolean;
  healingRelationship: boolean;
}

/**
 * Existing relationship-context categorical appraisal extracted verbatim from
 * relationshipBehaviorService. This function does not choose behavior.
 */
export function appraiseRelationshipContext(
  relationship: Readonly<RelationshipState>,
): RelationshipContextAppraisal {
  const familiarity = clamp01((relationship.familiarityDays ?? 0) / 30);
  const interactionFamiliarity = clamp01((relationship.interactionCount ?? 0) / 40);
  const warmth = clamp01((relationship.warmth ?? relationship.warmthScore ?? 50) / 100);
  const trust = clamp01((relationship.trust ?? relationship.trustScore ?? 50) / 100);
  const conflict = clamp01((relationship.conflictScore ?? 0) / 100);
  const hurt = clamp01((relationship.hurtScore ?? 0) / 100);
  const repair = clamp01((relationship.repairProgress ?? 0) / 100);
  const historyQuality = clamp01(
    (50 + (relationship.positiveEvents ?? 0) * 3 - (relationship.negativeEvents ?? 0) * 5) / 100,
  );
  const closeness = clamp01(
    familiarity * 0.27 +
      interactionFamiliarity * 0.13 +
      warmth * 0.18 +
      trust * 0.24 +
      historyQuality * 0.10 +
      repair * 0.08 -
      conflict * 0.25 -
      hurt * 0.22,
  );

  const establishedRelationship =
    (relationship.familiarityDays ?? 0) >= 14 ||
    (relationship.interactionCount ?? 0) >= 20;
  const friendlyRelationship =
    closeness >= 0.55 && trust >= 0.55 && conflict < 0.45 && hurt < 0.35;
  const damagedRelationship =
    conflict >= 0.35 || trust < 0.42 || hurt >= 0.30 || warmth < 0.35;
  const severelyDamagedRelationship =
    conflict >= 0.55 || trust < 0.32 || hurt >= 0.50 || warmth < 0.25;
  const healingRelationship =
    !damagedRelationship && (hurt >= 0.2 || conflict >= 0.2) && repair >= 0.1;

  return {
    familiarity,
    interactionFamiliarity,
    warmth,
    trust,
    conflict,
    hurt,
    repair,
    historyQuality,
    closeness,
    establishedRelationship,
    friendlyRelationship,
    damagedRelationship,
    severelyDamagedRelationship,
    healingRelationship,
  };
}

/**
 * Reuse the existing audited expectedness implementation rather than creating
 * another formula inside SocialAppraisal.
 */
export function socialExpectedness(
  context: AppraisalContextObservation,
): number {
  return computeExpectedness(context).value;
}
