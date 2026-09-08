import type { SemanticInterpretation, SemanticPrimaryIntent, SemanticSocialAct } from "../types/semanticInterpretation";
import type { SocialAppraisalResult } from "../types/socialAppraisal";
import { emotionalLoadBand } from "./emotionalLoadPolicy";

const MATERIAL_PRIMARY_INTENTS: ReadonlySet<SemanticPrimaryIntent> = new Set([
  "insult",
  "complaint",
  "rejection",
  "compliment",
  "support",
  "affection",
  "apology",
]);

const MATERIAL_SOCIAL_ACTS: ReadonlySet<SemanticSocialAct> = new Set<SemanticSocialAct>([
  "insult",
  "mockery",
  "boundary_test",
  "coercion",
  "manipulation",
  "privacy_violation",
  "affection",
  "apology",
  "repair",
]);

const maxSeverity = (semantic: Readonly<SemanticInterpretation>): number =>
  Math.max(
    semantic.severity.disrespect,
    semantic.severity.coercion,
    semantic.severity.manipulation,
    semantic.severity.privacy,
    semantic.severity.aggression,
  );

const hasMaterialCanonicalSocialScalar = (
  semantic: Readonly<SemanticInterpretation>,
): boolean =>
  semantic.affection > 0 ||
  semantic.support > 0 ||
  semantic.compliment > 0 ||
  semantic.apology ||
  semantic.repairAttempt;

/**
 * G1 material-evidence gate. It consumes canonical semantics only.
 *
 * This deliberately answers a narrow question: is there any semantic evidence
 * that justifies a non-zero social/affective appraisal? If not, downstream
 * relationship and affect transitions must receive an exact zero projection.
 */
export function hasMaterialSocialAppraisalEvidence(
  semantic: Readonly<SemanticInterpretation>,
): boolean {
  if (MATERIAL_PRIMARY_INTENTS.has(semantic.primaryIntent)) return true;
  if (semantic.secondarySocialActs.some((act) => MATERIAL_SOCIAL_ACTS.has(act))) return true;
  if (hasMaterialCanonicalSocialScalar(semantic)) return true;
  if (maxSeverity(semantic) > 0) return true;
  if (semantic.valence !== "neutral") return true;

  const loadBand = emotionalLoadBand(semantic.emotionalLoad);
  return loadBand === "salient" || loadBand === "intense";
}

/** Exact zero is a first-class appraisal result, not an absence/null state. */
export function exactZeroSocialAppraisal(
  reason: string = "no-material-social-evidence",
): SocialAppraisalResult {
  return {
    expectedness: 0,
    normDeviation: 0,
    confidence: 1,
    relational: {
      valence: "neutral",
      significance: 0,
      harmEvidence: 0,
      repairEvidence: 0,
    },
    affective: {
      valence: "neutral",
      significance: 0,
      activation: 0,
    },
    noMaterialEffect: true,
    reasons: [reason],
  };
}

/**
 * Returns an exact-zero result only when G1 can prove there is no material
 * canonical social evidence. `null` means appraisal must continue; it never
 * means zero.
 */
export function appraiseExactZeroIfNoMaterialEvidence(
  semantic: Readonly<SemanticInterpretation>,
): SocialAppraisalResult | null {
  if (hasMaterialSocialAppraisalEvidence(semantic)) return null;
  return exactZeroSocialAppraisal();
}
