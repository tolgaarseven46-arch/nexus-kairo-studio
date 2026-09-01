import type { DroitDynamicState } from "../types/nexus";
import type { CanonicalWorldEvent } from "./worldEventEngine";
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
    return {
      selfRevisionFactKey: factKey,
      selfRevisionStatus: "unavailable",
    };
  }
}

/**
 * Canonical mutation coordinator:
 * world-model persistence happens first, then that exact persisted observation
 * may be projected into Kaira-owned autobiography. Typed self-revision evidence,
 * when present, is evaluated only after the lived memory itself is canonical.
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
    if (append.status === "appended" || append.status === "duplicate") {
      const selfRevision = await maybeApplySelfRevision(
        instance,
        decision.memory.selfRevisionEvidence?.factKey,
      );
      return {
        status: append.status === "appended" ? "consolidated" : "duplicate",
        observationId: observation.id,
        memoryId: append.memoryId,
        consolidationDecision: decision.status,
        score: decision.score,
        reasons: decision.reasons,
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
