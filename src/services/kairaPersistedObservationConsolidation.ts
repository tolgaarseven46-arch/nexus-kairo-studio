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
import {
  appendKairaAutobiographicalMemoryAtomic,
  applyKairaSelfFactRevisionAtomic,
} from "./kairaCanonicalIdentityStore";
import {
  experiencePreferenceAppraisalFromActivityReceipt,
  type KairaActivityExecutionReceipt,
} from "./kairaActivityExperienceReceipt";
import { projectExperiencePreferenceEvidenceToLivedMemory } from "./kairaExperiencePreferenceAppraisal";

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

function projectActivityExperience(input: {
  instance: KairaInstanceContext;
  memory: KairaAutobiographicalMemory;
  receipt?: KairaActivityExecutionReceipt;
}): {
  memory: KairaAutobiographicalMemory;
  observability: Pick<KairaPersistedObservationConsolidationResult, "experiencePreferenceStatus" | "experiencePreferenceReason">;
} {
  if (!input.receipt) return { memory: input.memory, observability: {} };
  const appraisal = experiencePreferenceAppraisalFromActivityReceipt(input.instance, input.receipt);
  if (appraisal.status !== "appraisal") {
    return {
      memory: input.memory,
      observability: { experiencePreferenceStatus: "rejected", experiencePreferenceReason: appraisal.reason },
    };
  }
  const projection = projectExperiencePreferenceEvidenceToLivedMemory(input.memory, appraisal.appraisal);
  if (projection.status !== "projected") {
    return {
      memory: input.memory,
      observability: { experiencePreferenceStatus: "rejected", experiencePreferenceReason: projection.reason },
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
 * Single authority for turning an already-persisted canonical world observation
 * into Kaira-owned autobiography. It never writes world truth itself.
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

  const decision = appraiseLivedMemoryCandidate({
    instance,
    observation: input.observation,
    dynamicStateAfter: input.dynamicStateAfter,
  });
  if (decision.status !== "consolidate" || !decision.memory) {
    return {
      status: "candidate_rejected",
      observationId,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
    };
  }

  const activityProjection = projectActivityExperience({
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
        observationId,
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
        observationId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
        ...activityProjection.observability,
      };
    }
    return { status: "not_applicable", observationId, ...activityProjection.observability };
  } catch {
    return {
      status: "identity_unavailable",
      observationId,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
      ...activityProjection.observability,
    };
  }
}
