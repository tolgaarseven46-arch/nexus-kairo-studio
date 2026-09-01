import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import { instancePolicy, resolveKairaInstanceContext } from "./kairaInstanceContext";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  experiencePreferenceAppraisalFromActivityReceipt,
  type KairaActivityExecutionReceipt,
} from "./kairaActivityExperienceReceipt";
import { preferenceEvidenceFromExperienceAppraisal } from "./kairaExperiencePreferenceAppraisal";

export type KairaActivityAutobiographicalProjectionStatus =
  | "projected"
  | "skip_ephemeral_instance"
  | "skip_not_activity"
  | "skip_unpersisted"
  | "skip_owner_mismatch"
  | "skip_not_grounded"
  | "skip_invalid_activity"
  | "skip_not_completed"
  | "skip_missing_receipt"
  | "skip_receipt_mismatch"
  | "skip_invalid_outcome"
  | "skip_low_salience";

export interface KairaActivityAutobiographicalProjectionDecision {
  status: KairaActivityAutobiographicalProjectionStatus;
  score: number;
  reasons: string[];
  memory: KairaAutobiographicalMemory | null;
  preferenceEvidenceStatus?: "evidence" | "rejected";
  preferenceEvidenceReason?: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const canonicalKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
const valueKey = (value: string | number | boolean) =>
  `${typeof value}:${typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : String(value)}`;

function exactExperienceSubjectMatch(
  observation: WorldEventObservation,
  receipt: KairaActivityExecutionReceipt,
): boolean {
  const subject = observation.activity?.experienceSubject;
  const probe = receipt.preferenceProbe;
  if (!subject && !probe) return true;
  if (!subject || !probe) return false;
  return (
    subject.preferenceKey === canonicalKey(probe.preferenceKey) &&
    valueKey(subject.experiencedValue) === valueKey(probe.experiencedValue)
  );
}

/**
 * Activity autobiography has its own salience authority. It does not reuse the
 * social-interaction relationship score. A completed trusted activity can be a
 * salient lived episode from either positive or negative outcome magnitude.
 */
export function projectKairaActivityObservationToAutobiography(input: {
  instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">;
  observation: WorldEventObservation;
  receipt?: KairaActivityExecutionReceipt;
}): KairaActivityAutobiographicalProjectionDecision {
  const instance = resolveKairaInstanceContext(input.instance);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentAutobiography || !policy.canConsolidateCoreMemories) {
    return { status: "skip_ephemeral_instance", score: 0, reasons: ["instance_policy"], memory: null };
  }

  const observation = input.observation;
  if (observation.kind !== "kaira_activity") {
    return { status: "skip_not_activity", score: 0, reasons: ["kaira_activity_required"], memory: null };
  }
  if (!observation.id) {
    return { status: "skip_unpersisted", score: 0, reasons: ["observation_id_required"], memory: null };
  }
  if (resolveKairaInstanceContext({ instanceId: observation.kairaInstanceId }).instanceId !== instance.instanceId) {
    return { status: "skip_owner_mismatch", score: 0, reasons: ["instance_owner_mismatch"], memory: null };
  }
  if (observation.status !== "grounded") {
    return { status: "skip_not_grounded", score: 0, reasons: ["grounded_activity_required"], memory: null };
  }
  const activity = observation.activity;
  if (!activity?.activityId || !activity.activityType) {
    return { status: "skip_invalid_activity", score: 0, reasons: ["typed_activity_required"], memory: null };
  }
  if (activity.status !== "completed") {
    return { status: "skip_not_completed", score: 0, reasons: ["completed_activity_required"], memory: null };
  }
  if (!input.receipt) {
    return { status: "skip_missing_receipt", score: 0, reasons: ["trusted_outcome_receipt_required"], memory: null };
  }
  const receipt = input.receipt;
  if (
    receipt.sourceWorldObservationId !== observation.id ||
    canonicalKey(receipt.activityId) !== activity.activityId ||
    receipt.status !== activity.status ||
    !exactExperienceSubjectMatch(observation, receipt)
  ) {
    return { status: "skip_receipt_mismatch", score: 0, reasons: ["receipt_must_match_canonical_activity"], memory: null };
  }

  const appraisalDecision = experiencePreferenceAppraisalFromActivityReceipt(instance, receipt);
  if (appraisalDecision.status !== "appraisal") {
    return { status: "skip_invalid_outcome", score: 0, reasons: [appraisalDecision.reason], memory: null };
  }
  const appraisal = appraisalDecision.appraisal;
  if (
    !Number.isFinite(appraisal.outcomeValence) || appraisal.outcomeValence < -1 || appraisal.outcomeValence > 1 ||
    !Number.isFinite(appraisal.appraisalConfidence) || appraisal.appraisalConfidence < 0 || appraisal.appraisalConfidence > 1 ||
    !Number.isFinite(appraisal.attributionConfidence) || appraisal.attributionConfidence < 0 || appraisal.attributionConfidence > 1
  ) {
    return { status: "skip_invalid_outcome", score: 0, reasons: ["bounded_outcome_required"], memory: null };
  }

  const score = clamp01(
    Math.abs(appraisal.outcomeValence) * 0.55 +
    appraisal.appraisalConfidence * 0.25 +
    appraisal.attributionConfidence * 0.20,
  );
  if (score < 0.58) {
    return { status: "skip_low_salience", score, reasons: [`activity_salience:${score.toFixed(2)}`], memory: null };
  }

  const preferenceDecision = preferenceEvidenceFromExperienceAppraisal(appraisal);
  const facts = [
    `activity:${activity.activityId}`,
    `activity_type:${activity.activityType}`,
    `status:${activity.status}`,
  ];
  if (activity.experienceSubject) {
    facts.push(`experience_key:${activity.experienceSubject.preferenceKey}`);
    facts.push(`experience_value:${String(activity.experienceSubject.experiencedValue)}`);
  }
  const intensity = clamp01(Math.abs(appraisal.outcomeValence));
  const memory: KairaAutobiographicalMemory = {
    id: `lived_${observation.id}`,
    origin: "lived",
    occurredAt: observation.createdAt,
    participantIds: [],
    eventType: `activity:${activity.activityType}`,
    facts,
    emotions: intensity > 0
      ? [{ label: appraisal.outcomeValence >= 0 ? "olumlu_deneyim" : "olumsuz_deneyim", intensity }]
      : [],
    salience: score,
    sensitivity: "ordinary",
    canonical: true,
    sourceWorldObservationIds: [observation.id],
    consolidationKey: `world:${observation.id}`,
    ...(preferenceDecision.status === "evidence"
      ? { selfRevisionEvidence: { ...preferenceDecision.evidence } }
      : {}),
  };

  return {
    status: "projected",
    score,
    reasons: [`activity_salience:${score.toFixed(2)}`],
    memory,
    preferenceEvidenceStatus: preferenceDecision.status,
    preferenceEvidenceReason: preferenceDecision.reason,
  };
}
