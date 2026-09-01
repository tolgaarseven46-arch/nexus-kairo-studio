import type { DroitDynamicState } from "../types/nexus";
import type { CanonicalWorldEvent } from "./worldEventEngine";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import { saveWorldEventObservation } from "./worldModelEventStore";
import { appraiseLivedMemoryCandidate } from "./kairaLivedMemoryConsolidation";
import { appendKairaAutobiographicalMemoryAtomic } from "./kairaCanonicalIdentityStore";

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
}

/**
 * Canonical mutation coordinator:
 * world-model persistence happens first, then that exact persisted observation
 * may be projected into Kaira-owned autobiography. Autobiography never becomes
 * an alternate source of world truth.
 */
export async function persistWorldEventAndMaybeConsolidateLivedMemory(input: {
  userId?: string;
  instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">;
  sessionId: string;
  speakerName?: string;
  event: CanonicalWorldEvent;
  dynamicStateAfter: DroitDynamicState;
}): Promise<KairaLivedMemoryRuntimeResult> {
  const instance = resolveKairaInstanceContext(input.instance);
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentWorldModel) {
    return { status: "not_applicable" };
  }

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

  try {
    const append = await appendKairaAutobiographicalMemoryAtomic(instance, decision.memory);
    if (append.status === "appended") {
      return {
        status: "consolidated",
        observationId: observation.id,
        memoryId: append.memoryId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
      };
    }
    if (append.status === "duplicate") {
      return {
        status: "duplicate",
        observationId: observation.id,
        memoryId: append.memoryId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
      };
    }
    if (append.status === "missing_identity") {
      return {
        status: "identity_missing",
        observationId: observation.id,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
      };
    }
    return { status: "not_applicable", observationId: observation.id };
  } catch {
    return {
      status: "identity_unavailable",
      observationId: observation.id,
      consolidationDecision: decision.status,
      score: decision.score,
      reasons: decision.reasons,
    };
  }
}
