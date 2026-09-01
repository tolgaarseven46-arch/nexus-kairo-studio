import type { DroitDynamicState } from "../types/nexus";
import type { CanonicalWorldEvent } from "./worldEventEngine";
import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import { saveWorldEventObservation } from "./worldModelEventStore";
import { appraiseLivedMemoryCandidate } from "./kairaLivedMemoryConsolidation";
import {
  appendKairaAutobiographicalMemoryAtomic,
  applyKairaSelfFactRevisionAtomic,
} from "./kairaCanonicalIdentityStore";
import {
  experiencePreferenceAppraisalFromActivityReceipt,
  type KairaActivityExecutionReceipt,
} from "./kairaActivityExperienceReceipt";
import { projectExperiencePreferenceEvidenceToLivedMemory } from "./kairaExperiencePreferenceAppraisal";

export type KairaLivedMemoryRuntimeStatus =
  | "not_applicable"
  | "world_event_skipped"
  | "world_event_unavailable"
  | "candidate_rejected"
  | "consolidated"
  | "duplicate"
  | "identity_missing"
  | "identity_unavailable";

export interface KairaLivedMemoryRuntimeResult {
  status: KairaLivedMemoryRuntimeStatus;
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
): Promise<Pick<KairaLivedMemoryRuntimeResult, "selfRevisionFactKey" | "selfRevisionStatus" | "selfRevisionDecision">> {
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

function maybeProjectActivityExperience(input: {
  instance: KairaInstanceContext;
  memory: KairaAutobiographicalMemory;
  receipt?: KairaActivityExecutionReceipt;
}): {
  memory: KairaAutobiographicalMemory;
  observability: Pick<KairaLivedMemoryRuntimeResult, "experiencePreferenceStatus" | "experiencePreferenceReason">;
} {
  if (!input.receipt) return { memory: input.memory, observability: {} };

  const appraisal = experiencePreferenceAppraisalFromActivityReceipt(input.instance, input.receipt);
  if (appraisal.status !== "appraisal") {
    return {
      memory: input.memory,
      observability: {
        experiencePreferenceStatus: "rejected",
        experiencePreferenceReason: appraisal.reason,
      },
    };
  }

  const projection = projectExperiencePreferenceEvidenceToLivedMemory(input.memory, appraisal.appraisal);
  if (projection.status !== "projected") {
    return {
      memory: input.memory,
      observability: {
        experiencePreferenceStatus: "rejected",
        experiencePreferenceReason: projection.reason,
      },
    };
  }
  return {
    memory: projection.memory,
    observability: {
      experiencePreferenceStatus: "projected",
      experiencePreferenceReason: "direct_completed_positive_outcome",
    },
  };
}

/**
 * Canonical mutation coordinator:
 * world-model persistence happens first, then that exact persisted observation
 * may be projected into Kaira-owned autobiography. A trusted Kaira activity
 * receipt may add preference evidence only when it points to that same world
 * observation. Self-revision runs only after autobiography is canonical.
 */
export async function persistWorldEventAndMaybeConsolidateLivedMemory(input: {
  userId?: string;
  instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">;
  sessionId: string;
  speakerName?: string;
  event: CanonicalWorldEvent;
  dynamicStateAfter: DroitDynamicState;
  activityExperienceReceipt?: KairaActivityExecutionReceipt;
}): Promise<KairaLivedMemoryRuntimeResult> {
  const instance = resolveKairaInstanceContext(input.instance);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentWorldModel) return { status: "not_applicable" };

  let observation;
  try {
    observation = await saveWorldEventObservation({
      userId: input.userId,
      kairaInstanceId: instance.instanceId,
      sessionId: input.sessionId,
      speakerName: input.speakerName,
      event: input.event,
    });
  } catch {
    return { status: "world_event_unavailable" };
  }
  if (!observation) return { status: "world_event_skipped" };

  const decision = appraiseLivedMemoryCandidate({
    instance,
    observation,
    dynamicStateAfter: input.dynamicStateAfter,
  });
  if (decision.status !== "consolidate" || !decision.memory) {
    return {
      status: "candidate_rejected",
      observationId: observation.id,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
    };
  }

  const activityProjection = maybeProjectActivityExperience({
    instance,
    memory: decision.memory,
    receipt: input.activityExperienceReceipt,
  });
  const memory = activityProjection.memory;

  try {
    const append = await appendKairaAutobiographicalMemoryAtomic(instance, memory);
    if (append.status === "appended" || append.status === "duplicate") {
      const selfRevision = await maybeApplySelfRevision(instance, memory.selfRevisionEvidence?.factKey);
      return {
        status: append.status === "appended" ? "consolidated" : "duplicate",
        observationId: observation.id,
        memoryId: append.memoryId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
        ...activityProjection.observability,
        ...selfRevision,
      };
    }
    if (append.status === "missing_identity") {
      return {
        status: "identity_missing",
        observationId: observation.id,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
        ...activityProjection.observability,
      };
    }
    return { status: "not_applicable", observationId: observation.id, ...activityProjection.observability };
  } catch {
    return {
      status: "identity_unavailable",
      observationId: observation.id,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
      ...activityProjection.observability,
    };
  }
}
