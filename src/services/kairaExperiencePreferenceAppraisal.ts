import type { KairaSelfRevisionEvidence } from "./kairaSelfRevisionEvidence";

export type KairaExperienceCompletion = "completed" | "interrupted" | "ongoing";
export type KairaExperienceOwnership = "kaira_direct" | "reported" | "inferred";

/**
 * A typed, Kaira-owned appraisal of one completed lived experience.
 *
 * This is deliberately downstream of world truth and upstream of canonical
 * self-revision. Raw messages, eventType strings, dialogue moves and static
 * fine-tune preference profiles are not valid inputs here.
 */
export interface KairaExperiencePreferenceAppraisal {
  experienceId: string;
  sourceWorldObservationId: string;
  ownership: KairaExperienceOwnership;
  completion: KairaExperienceCompletion;
  preferenceKey: string;
  experiencedValue: string | number | boolean;
  /** -1 = strongly aversive, +1 = strongly rewarding. */
  outcomeValence: number;
  /** Confidence that the valence appraisal itself is reliable. */
  appraisalConfidence: number;
  /** Confidence that the experienced value, rather than unrelated context, caused the outcome. */
  attributionConfidence: number;
}

export type KairaExperiencePreferenceEvidenceDecision =
  | { status: "evidence"; evidence: KairaSelfRevisionEvidence; reason: "direct_completed_positive_outcome" }
  | {
      status: "rejected";
      evidence: null;
      reason:
        | "invalid"
        | "not_direct"
        | "not_completed"
        | "weak_or_negative_outcome"
        | "low_appraisal_confidence"
        | "low_attribution_confidence";
    };

const finiteInRange = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max;

const validValue = (value: unknown): value is string | number | boolean =>
  (typeof value === "string" && Boolean(value.trim())) ||
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean";

/**
 * Converts an explicit experience outcome appraisal into preference evidence.
 *
 * Important: this function does not discover what Kaira experienced or how she
 * felt from prose. It only validates an already-typed Kaira-owned appraisal.
 * Beliefs are intentionally excluded: epistemic belief revision requires a
 * separate evidence authority, not affect/reward.
 */
export function preferenceEvidenceFromExperienceAppraisal(
  input: KairaExperiencePreferenceAppraisal,
): KairaExperiencePreferenceEvidenceDecision {
  const experienceId = String(input.experienceId || "").trim();
  const sourceWorldObservationId = String(input.sourceWorldObservationId || "").trim();
  const preferenceKey = String(input.preferenceKey || "").trim();

  if (
    !experienceId ||
    !sourceWorldObservationId ||
    !preferenceKey ||
    !validValue(input.experiencedValue) ||
    !finiteInRange(input.outcomeValence, -1, 1) ||
    !finiteInRange(input.appraisalConfidence, 0, 1) ||
    !finiteInRange(input.attributionConfidence, 0, 1)
  ) {
    return { status: "rejected", evidence: null, reason: "invalid" };
  }
  if (input.ownership !== "kaira_direct") {
    return { status: "rejected", evidence: null, reason: "not_direct" };
  }
  if (input.completion !== "completed") {
    return { status: "rejected", evidence: null, reason: "not_completed" };
  }
  if (input.outcomeValence < 0.55) {
    return { status: "rejected", evidence: null, reason: "weak_or_negative_outcome" };
  }
  if (input.appraisalConfidence < 0.78) {
    return { status: "rejected", evidence: null, reason: "low_appraisal_confidence" };
  }
  if (input.attributionConfidence < 0.8) {
    return { status: "rejected", evidence: null, reason: "low_attribution_confidence" };
  }

  const confidence = Math.max(
    0,
    Math.min(
      1,
      input.outcomeValence * 0.35 +
        input.appraisalConfidence * 0.3 +
        input.attributionConfidence * 0.35,
    ),
  );

  return {
    status: "evidence",
    evidence: {
      factKey: preferenceKey,
      domain: "preference",
      value: typeof input.experiencedValue === "string"
        ? input.experiencedValue.trim()
        : input.experiencedValue,
      confidence,
    },
    reason: "direct_completed_positive_outcome",
  };
}
