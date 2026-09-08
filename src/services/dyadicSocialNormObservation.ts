import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { SemanticRelationshipScope } from "./languageUnderstandingService";
import {
  dyadicNormKeyForInterpretation,
  observeDyadicNorm,
  type DyadicNormImpact,
  type DyadicSocialNormProfile,
} from "./dyadicSocialNorm";
import { generateSocialAppraisalCandidateReadings } from "./socialAppraisalCandidateReadings";

const maxPlausibility = (
  values: readonly ReturnType<typeof generateSocialAppraisalCandidateReadings>[number][],
  direction: "harmful" | "benign" | "repairing" | "neutral",
): number => values.reduce(
  (max, candidate) => candidate.direction === direction ? Math.max(max, candidate.plausibility) : max,
  0,
);

/**
 * Classifies a completed canonical turn for future dyadic learning.
 *
 * Temporal authority rule: this is called only AFTER the current turn's G2/G3/G4
 * appraisal has consumed the previous profile. It therefore cannot let a turn
 * influence its own interpretation. The impact is derived from G2a canonical
 * candidates before dyadic reweighting, so learned priors cannot self-reinforce.
 */
export function observeCanonicalDyadicNorm(
  profile: Readonly<DyadicSocialNormProfile>,
  semantic: Readonly<SemanticInterpretation>,
  relationshipScope: SemanticRelationshipScope | undefined,
  observedAt: string,
): DyadicSocialNormProfile {
  const targetsActiveDyad =
    semantic.target === "kaira" ||
    (semantic.target === "unknown" && relationshipScope === "kaira_user");
  if (!targetsActiveDyad || relationshipScope === "third_party" || relationshipScope === "event") {
    return { ...profile };
  }

  const key = dyadicNormKeyForInterpretation(semantic);
  if (!key) return { ...profile };

  const candidates = generateSocialAppraisalCandidateReadings(semantic);
  const harmful = maxPlausibility(candidates, "harmful");
  const benign = maxPlausibility(candidates, "benign");
  const repairing = maxPlausibility(candidates, "repairing");

  let impact: DyadicNormImpact = "unknown";
  if (harmful > 0 || benign > 0) {
    if (harmful > benign + 0.12) impact = "harmful";
    else if (benign > harmful + 0.12) impact = "benign";
    else impact = "mixed";
  } else if (repairing > 0) {
    impact = "benign";
  }

  return observeDyadicNorm(profile, { key, impact, observedAt });
}