import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import type { KairaExperiencePreferenceAppraisal } from "./kairaExperiencePreferenceAppraisal";

export type KairaActivityExecutionStatus =
  | "planned"
  | "active"
  | "completed"
  | "cancelled"
  | "failed";

export interface KairaActivityPreferenceProbe {
  preferenceKey: string;
  experiencedValue: string | number | boolean;
}

export interface KairaActivityOutcomeAppraisal {
  outcomeValence: number;
  appraisalConfidence: number;
  attributionConfidence: number;
}

/**
 * Trusted execution receipt emitted by a future Kaira-owned activity executor.
 * It is not user prose and it is not a generic world-event interpretation.
 * The activity must already have a canonical world observation before this
 * receipt can feed autobiographical preference learning.
 */
export interface KairaActivityExecutionReceipt {
  authority: "kaira_activity_executor";
  activityId: string;
  kairaInstanceId: string;
  sourceWorldObservationId: string;
  status: KairaActivityExecutionStatus;
  preferenceProbe?: KairaActivityPreferenceProbe;
  outcome?: KairaActivityOutcomeAppraisal;
}

export type KairaActivityExperienceReceiptDecision =
  | { status: "appraisal"; appraisal: KairaExperiencePreferenceAppraisal }
  | {
      status: "rejected";
      appraisal: null;
      reason:
        | "ephemeral_instance"
        | "instance_mismatch"
        | "invalid_receipt"
        | "not_completed"
        | "missing_preference_probe"
        | "missing_outcome";
    };

const validValue = (value: unknown): value is string | number | boolean =>
  (typeof value === "string" && Boolean(value.trim())) ||
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean";

/**
 * Converts only a trusted, completed, instance-owned activity receipt into the
 * typed experience appraisal consumed by the preference evidence authority.
 * No raw message/event heuristic exists in this seam.
 */
export function experiencePreferenceAppraisalFromActivityReceipt(
  instanceInput: Pick<KairaInstanceContext, "instanceId" | "instanceType">,
  receipt: KairaActivityExecutionReceipt,
): KairaActivityExperienceReceiptDecision {
  const instance = resolveKairaInstanceContext(instanceInput);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentAutobiography || !policy.canConsolidateCoreMemories) {
    return { status: "rejected", appraisal: null, reason: "ephemeral_instance" };
  }

  const receiptInstanceId = resolveKairaInstanceContext({ instanceId: receipt.kairaInstanceId }).instanceId;
  if (receiptInstanceId !== instance.instanceId) {
    return { status: "rejected", appraisal: null, reason: "instance_mismatch" };
  }
  if (
    receipt.authority !== "kaira_activity_executor" ||
    !String(receipt.activityId || "").trim() ||
    !String(receipt.sourceWorldObservationId || "").trim()
  ) {
    return { status: "rejected", appraisal: null, reason: "invalid_receipt" };
  }
  if (receipt.status !== "completed") {
    return { status: "rejected", appraisal: null, reason: "not_completed" };
  }
  if (
    !receipt.preferenceProbe ||
    !String(receipt.preferenceProbe.preferenceKey || "").trim() ||
    !validValue(receipt.preferenceProbe.experiencedValue)
  ) {
    return { status: "rejected", appraisal: null, reason: "missing_preference_probe" };
  }
  if (!receipt.outcome) {
    return { status: "rejected", appraisal: null, reason: "missing_outcome" };
  }

  return {
    status: "appraisal",
    appraisal: {
      experienceId: `activity:${String(receipt.activityId).trim()}`,
      sourceWorldObservationId: String(receipt.sourceWorldObservationId).trim(),
      ownership: "kaira_direct",
      completion: "completed",
      preferenceKey: String(receipt.preferenceProbe.preferenceKey).trim(),
      experiencedValue:
        typeof receipt.preferenceProbe.experiencedValue === "string"
          ? receipt.preferenceProbe.experiencedValue.trim()
          : receipt.preferenceProbe.experiencedValue,
      outcomeValence: receipt.outcome.outcomeValence,
      appraisalConfidence: receipt.outcome.appraisalConfidence,
      attributionConfidence: receipt.outcome.attributionConfidence,
    },
  };
}
