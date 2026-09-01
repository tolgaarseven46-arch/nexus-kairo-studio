import type { DroitDynamicState } from "../types/nexus";
import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import {
  observationKairaInstanceId,
  type WorldEventObservation,
} from "./worldModelEventStore";
import { appraiseLivedMemoryCandidate } from "./kairaLivedMemoryConsolidation";
import { projectKairaActivityObservationToAutobiography } from "./kairaActivityAutobiographicalProjection";
import {
  appendKairaAutobiographicalMemoryAtomic,
  applyKairaSelfFactRevisionAtomic,
} from "./kairaCanonicalIdentityStore";
import type { KairaActivityExecutionReceipt } from "./kairaActivityExperienceReceipt";

export type KairaPersistedObservationConsolidationStatus =
  | "not_applicable"
  | "observation_invalid"
  | "observation_owner_mismatch"
  | "candidate_rejected"
  | "consolidated"
  | "duplicate"
  | "identity_missing"
  | "identity_unavailable";

export interface KairaPersistedObservationConsolidationResult {
  status: KairaPersistedObservationConsolidationStatus;
  observationId?: string;
  memoryId?: string;
  consolidationDecision?: string;
  score?: number;
  reasons?: string[];
  experiencePreferenceStatus?: "projected" | "rejected";
  experiencePreferenceReason?: string;
  selfRevisionFactKey?: string;
  selfRevisionStatus?: "applied" | "unchanged" | "missing_identity" | "ephemeral" | "unavailable";
  selfRevisionDecision?: string;
}

async function maybeApplySelfRevision(
  instance: KairaInstanceContext,
  factKey?: string,
): Promise<Pick<KairaPersistedObservationConsolidationResult, "selfRevisionFactKey" | "selfRevisionStatus" | "selfRevisionDecision">> {
  if (!factKey) return {};
  try {
    const result = await applyKairaSelfFactRevisionAtomic(instance, factKey);
    return {
      selfRevisionFactKey: factKey,
      selfRevisionStatus: result.status,
      ...(result.decision ? { selfRevisionDecision: result.decision.status } : {}),
    };
  } catch {
    return { selfRevisionFactKey: factKey, selfRevisionStatus: "unavailable" };
  }
}

function selectAutobiographicalCandidate(input: {
  instance: KairaInstanceContext;
  observation: WorldEventObservation;
  dynamicStateAfter: DroitDynamicState;
  activityExperienceReceipt?: KairaActivityExecutionReceipt;
}): {
  status: string;
  score: number;
  reasons: string[];
  memory: KairaAutobiographicalMemory | null;
  observability: Pick<KairaPersistedObservationConsolidationResult, "experiencePreferenceStatus" | "experiencePreferenceReason">;
} {
  if (input.observation.kind === "kaira_activity") {
    const activityDecision = projectKairaActivityObservationToAutobiography({
      instance: input.instance,
      observation: input.observation,
      receipt: input.activityExperienceReceipt,
    });
    return {
      status: activityDecision.status,
      score: activityDecision.score,
      reasons: activityDecision.reasons,
      memory: activityDecision.memory,
      observability:
        activityDecision.preferenceEvidenceStatus === "evidence"
          ? {
              experiencePreferenceStatus: "projected",
              experiencePreferenceReason: activityDecision.preferenceEvidenceReason,
            }
          : activityDecision.preferenceEvidenceStatus === "rejected"
            ? {
                experiencePreferenceStatus: "rejected",
                experiencePreferenceReason: activityDecision.preferenceEvidenceReason,
              }
            : {},
    };
  }

  const socialDecision = appraiseLivedMemoryCandidate({
    instance: input.instance,
    observation: input.observation,
    dynamicStateAfter: input.dynamicStateAfter,
  });
  return {
    status: socialDecision.status,
    score: socialDecision.score,
    reasons: socialDecision.reasons,
    memory: socialDecision.memory,
    observability: input.activityExperienceReceipt
      ? {
          experiencePreferenceStatus: "rejected",
          experiencePreferenceReason: "activity_receipt_requires_kaira_activity",
        }
      : {},
  };
}

/**
 * Single authority for turning an already-persisted canonical world observation
 * into Kaira-owned autobiography. It never writes world truth itself.
 * Social interaction and Kaira-owned activity observations intentionally use
 * different autobiographical appraisal authorities.
 */
export async function consolidatePersistedWorldObservation(input: {
  instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">;
  observation: WorldEventObservation;
  dynamicStateAfter: DroitDynamicState;
  activityExperienceReceipt?: KairaActivityExecutionReceipt;
}): Promise<KairaPersistedObservationConsolidationResult> {
  const instance = resolveKairaInstanceContext(input.instance);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentAutobiography || !policy.canConsolidateCoreMemories) {
    return { status: "not_applicable" };
  }
  const observationId = String(input.observation.id || "").trim();
  if (!observationId) return { status: "observation_invalid" };
  if (observationKairaInstanceId(input.observation) !== instance.instanceId) {
    return { status: "observation_owner_mismatch", observationId };
  }

  const decision = selectAutobiographicalCandidate({
    instance,
    observation: input.observation,
    dynamicStateAfter: input.dynamicStateAfter,
    activityExperienceReceipt: input.activityExperienceReceipt,
  });
  if (!decision.memory) {
    return {
      status: "candidate_rejected",
      observationId,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
      ...decision.observability,
    };
  }

  const memory = decision.memory;
  try {
    const append = await appendKairaAutobiographicalMemoryAtomic(instance, memory);
    if (append.status === "appended" || append.status === "duplicate") {
      const selfRevision = await maybeApplySelfRevision(instance, memory.selfRevisionEvidence?.factKey);
      return {
        status: append.status === "appended" ? "consolidated" : "duplicate",
        observationId,
        memoryId: append.memoryId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
        ...decision.observability,
        ...selfRevision,
      };
    }
    if (append.status === "missing_identity") {
      return {
        status: "identity_missing",
        observationId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
        ...decision.observability,
      };
    }
    return { status: "not_applicable", observationId, ...decision.observability };
  } catch {
    return {
      status: "identity_unavailable",
      observationId,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
      ...decision.observability,
    };
  }
}
