import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { DyadicSocialNormProfile } from "../types/dyadicSocialNorm";
import type { AppraisalValence, SocialAppraisalResult } from "../types/socialAppraisal";
import {
  appraiseExactZeroIfNoMaterialEvidence,
} from "./socialAppraisalZeroEffect";
import {
  emptyDyadicSocialNorm,
} from "./dyadicSocialNorm";
import {
  generateSocialAppraisalCandidateReadings,
  type SocialAppraisalReadingKind,
} from "./socialAppraisalCandidateReadings";
import {
  reweightSocialAppraisalCandidatesForDyad,
  type DyadicCandidateReweightResult,
  type DyadicReweightedCandidateReading,
} from "./dyadicCandidateReweight";

export type SocialAppraisalRelationshipScope =
  | "kaira_user"
  | "third_party"
  | "event"
  | "unknown";

export interface SocialAppraisalResolutionG3 {
  appraisal: SocialAppraisalResult;
  candidates: readonly DyadicReweightedCandidateReading[];
  dominantReading: SocialAppraisalReadingKind | null;
  ambiguity: number;
  dyadicApplied: boolean;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const maxSeverity = (semantic: Readonly<SemanticInterpretation>): number =>
  Math.max(
    semantic.severity.disrespect,
    semantic.severity.coercion,
    semantic.severity.manipulation,
    semantic.severity.privacy,
    semantic.severity.aggression,
  );

function maxCandidate(
  candidates: readonly DyadicReweightedCandidateReading[],
  predicate: (candidate: DyadicReweightedCandidateReading) => boolean,
): number {
  let max = 0;
  for (const candidate of candidates) {
    if (predicate(candidate)) max = Math.max(max, candidate.plausibility);
  }
  return max;
}

function projectionValence(
  negative: number,
  positive: number,
): AppraisalValence {
  if (negative > positive + 0.05) return "negative";
  if (positive > negative + 0.05) return "positive";
  return "neutral";
}

function candidateAmbiguity(candidates: readonly DyadicReweightedCandidateReading[]): number {
  if (candidates.length <= 1) return 0;
  const sorted = [...candidates].sort((a, b) => b.plausibility - a.plausibility);
  const margin = clamp01(sorted[0].plausibility - sorted[1].plausibility);
  return clamp01(1 - margin);
}

function dominantReading(
  candidates: readonly DyadicReweightedCandidateReading[],
): SocialAppraisalReadingKind | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.plausibility - a.plausibility)[0].kind;
}

/**
 * G3 contextual resolution.
 *
 * This is still a pure appraisal layer: it produces independent relational and
 * affective projections but does not mutate RelationshipState, mood, memory, or
 * behavior. Personality/current-state modulation and reducer wiring remain later
 * seams.
 *
 * Grounding may resolve an otherwise-unknown semantic target to the active dyad.
 * It may not override an explicit self/third-party/event target. This keeps
 * entity/world grounding useful without creating a second semantic interpreter.
 */
export function resolveSocialAppraisalG3(
  semantic: Readonly<SemanticInterpretation>,
  subjectId: string,
  profile?: Readonly<DyadicSocialNormProfile>,
  relationshipScope?: SocialAppraisalRelationshipScope,
): SocialAppraisalResolutionG3 {
  const exactZero = appraiseExactZeroIfNoMaterialEvidence(semantic);
  if (exactZero) {
    return {
      appraisal: exactZero,
      candidates: [],
      dominantReading: null,
      ambiguity: 0,
      dyadicApplied: false,
    };
  }

  const baseCandidates = generateSocialAppraisalCandidateReadings(semantic);
  const dyadic: DyadicCandidateReweightResult = reweightSocialAppraisalCandidatesForDyad(
    semantic,
    baseCandidates,
    subjectId,
    profile ?? emptyDyadicSocialNorm(subjectId),
  );
  const candidates = dyadic.candidates;

  const harm = maxCandidate(candidates, (candidate) => candidate.direction === "harmful");
  const repair = maxCandidate(candidates, (candidate) => candidate.direction === "repairing");
  const affiliative = maxCandidate(candidates, (candidate) => candidate.kind === "affiliative");
  const playful = maxCandidate(candidates, (candidate) => candidate.kind === "playful_banter");

  const targetsKaira =
    semantic.target === "kaira" ||
    (semantic.target === "unknown" && relationshipScope === "kaira_user");
  const relationalHarm = targetsKaira ? harm : 0;
  const relationalRepair = targetsKaira ? repair : 0;
  const relationalPositive = targetsKaira ? affiliative : 0;
  const relationalSignificance = clamp01(
    Math.max(relationalHarm, relationalRepair, relationalPositive * 0.85),
  );
  const relationalValence = projectionValence(
    relationalHarm,
    Math.max(relationalRepair, relationalPositive),
  );

  let affectiveNegative = harm;
  let affectivePositive = Math.max(affiliative, repair * 0.7, playful * 0.35);
  if (semantic.valence === "negative") {
    affectiveNegative = Math.max(affectiveNegative, semantic.emotionalLoad * 0.8);
  } else if (semantic.valence === "positive") {
    affectivePositive = Math.max(affectivePositive, semantic.emotionalLoad * 0.8);
  }

  const affectiveSignificance = clamp01(
    Math.max(affectiveNegative, affectivePositive, semantic.emotionalLoad * 0.55),
  );
  const affectiveValence = projectionValence(affectiveNegative, affectivePositive);
  const activation = clamp01(
    Math.max(maxSeverity(semantic) * 0.9, semantic.emotionalLoad, affectiveSignificance * 0.6),
  );

  const ambiguity = candidateAmbiguity(candidates);
  const confidence = clamp01(
    (1 - semantic.uncertainty.overall) * 0.7 + (1 - ambiguity) * 0.3,
  );
  const expectedness = dyadic.normReading?.expectedness ?? 0;
  const normDeviation = dyadic.normReading?.established ? clamp01(1 - expectedness) : 0;

  const appraisal: SocialAppraisalResult = {
    expectedness,
    normDeviation,
    confidence,
    relational: {
      valence: relationalValence,
      significance: relationalSignificance,
      harmEvidence: relationalHarm,
      repairEvidence: relationalRepair,
    },
    affective: {
      valence: affectiveValence,
      significance: affectiveSignificance,
      activation,
    },
    noMaterialEffect: relationalSignificance <= 0 && affectiveSignificance <= 0,
    reasons: [
      ...dyadic.reasons,
      `dominant-reading:${dominantReading(candidates) ?? "none"}`,
      targetsKaira ? "relational-target:kaira" : "relational-target:not-kaira",
      semantic.target === "unknown" && relationshipScope === "kaira_user"
        ? "relational-target:grounded-active-dyad"
        : "relational-target:semantic",
    ],
  };

  return {
    appraisal,
    candidates,
    dominantReading: dominantReading(candidates),
    ambiguity,
    dyadicApplied: dyadic.dyadicApplied,
  };
}
