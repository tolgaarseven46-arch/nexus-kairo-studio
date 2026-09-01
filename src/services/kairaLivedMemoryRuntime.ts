import type { DroitDynamicState } from "../types/nexus";
import type { CanonicalWorldEvent } from "./worldEventEngine";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import { saveWorldEventObservation } from "./worldModelEventStore";
import { consolidatePersistedWorldObservation } from "./kairaPersistedObservationConsolidation";

export type KairaLivedMemoryRuntimeStatus =
  | "not_applicable"
  | "world_event_skipped"
  | "world_event_unavailable"
  | "observation_invalid"
  | "observation_owner_mismatch"
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
  selfRevisionFactKey?: string;
  selfRevisionStatus?: "applied" | "unchanged" | "missing_identity" | "ephemeral" | "unavailable";
  selfRevisionDecision?: string;
}

/**
 * Pre-persistence coordinator for ordinary chat/world events.
 *
 * This function owns only canonical world-event persistence. Once the exact
 * observation exists, all autobiographical consolidation and self-revision is
 * delegated to the shared post-persistence authority. Future activity runtimes
 * can call that authority directly without writing world truth twice.
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

  return consolidatePersistedWorldObservation({
    instance,
    observation,
    dynamicStateAfter: input.dynamicStateAfter,
  });
}
