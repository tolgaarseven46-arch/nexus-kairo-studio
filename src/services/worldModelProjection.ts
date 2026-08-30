import {
  observationKairaInstanceId,
  type WorldEventObservation,
} from "./worldModelEventStore";
import {
  observationPolarity,
  observationPropositionKey,
  resolveContradictionEvidence,
} from "./worldEventContradictionResolver";
import {
  resolvePlanLifecycle,
  type PlanLifecycleResolution,
} from "./worldEventLifecycle";

export type WorldModelAssertionState =
  | "affirmed"
  | "denied"
  | "conflicting"
  | "unknown";

export interface WorldModelPropositionState {
  kairaInstanceId: string;
  propositionKey: string;
  assertionState: WorldModelAssertionState;
  evidenceStatus: "consistent" | "conflicting" | "unknown";
  latestEvidenceId?: string;
  latestEvidenceAt?: string;
  latestEvidencePolarity: "positive" | "negative" | "unknown";
  latestEvidenceCertainty: number;
  evidenceObservationIds: string[];
  lifecycle: PlanLifecycleResolution;
}

const observationIdentity = (item: WorldEventObservation) =>
  item.id || `${item.sessionId}:${item.createdAt}:${item.event.raw}`;

function assertionStateFor(input: {
  status: "consistent" | "conflicting" | "unknown";
  latest?: WorldEventObservation;
}): WorldModelAssertionState {
  if (input.status === "conflicting") return "conflicting";
  if (input.status === "unknown" || !input.latest) return "unknown";
  const polarity = observationPolarity(input.latest);
  if (polarity === "positive") return "affirmed";
  if (polarity === "negative") return "denied";
  return "unknown";
}

/**
 * Canonical read-model over the immutable world-event log.
 *
 * Important: this is a projection, never a replacement for source evidence.
 * It compresses many observations into bounded proposition state while keeping
 * every evidence id auditable. Kaira instances are partitioned inside the
 * projection as a second safety boundary even if a caller accidentally mixes
 * observations from multiple instances.
 */
export function projectWorldModel(
  observations: WorldEventObservation[],
): WorldModelPropositionState[] {
  const instanceGroups = new Map<string, WorldEventObservation[]>();
  for (const item of observations) {
    const instanceId = observationKairaInstanceId(item);
    const group = instanceGroups.get(instanceId) || [];
    group.push(item);
    instanceGroups.set(instanceId, group);
  }

  const projected: WorldModelPropositionState[] = [];
  for (const [kairaInstanceId, instanceObservations] of instanceGroups) {
    const contradictionSets = resolveContradictionEvidence(instanceObservations);
    for (const set of contradictionSets) {
      const latest = set.latest;
      const lifecycle = resolvePlanLifecycle(instanceObservations, set.propositionKey);
      projected.push({
        kairaInstanceId,
        propositionKey: set.propositionKey,
        assertionState: assertionStateFor({ status: set.status, latest }),
        evidenceStatus: set.status,
        latestEvidenceId: latest?.id,
        latestEvidenceAt: latest?.createdAt,
        latestEvidencePolarity: latest ? observationPolarity(latest) : "unknown",
        latestEvidenceCertainty: Math.max(0, Math.min(1, Number(latest?.event.certainty ?? 0))),
        evidenceObservationIds: set.observations.map(observationIdentity),
        lifecycle,
      });
    }
  }

  return projected.sort((a, b) =>
    String(b.latestEvidenceAt || "").localeCompare(String(a.latestEvidenceAt || "")),
  );
}

export function propositionStateForObservation(
  focus: WorldEventObservation,
  observations: WorldEventObservation[],
): WorldModelPropositionState | undefined {
  const instanceId = observationKairaInstanceId(focus);
  const propositionKey = observationPropositionKey(focus);
  return projectWorldModel(observations).find(
    (state) =>
      state.kairaInstanceId === instanceId &&
      state.propositionKey === propositionKey,
  );
}

export interface WorldModelProjectionIssue {
  invariant: string;
  message: string;
}

export function validateWorldModelProjection(
  observations: WorldEventObservation[],
  projection = projectWorldModel(observations),
): WorldModelProjectionIssue[] {
  const issues: WorldModelProjectionIssue[] = [];
  const sourceIds = observations.map(observationIdentity);
  const projectedIds = projection.flatMap((state) => state.evidenceObservationIds);

  for (const sourceId of sourceIds) {
    const count = projectedIds.filter((id) => id === sourceId).length;
    if (count !== 1) {
      issues.push({
        invariant: "world_projection.preserve_each_source_once",
        message: `Observation projection içinde tam bir kez bulunmalı: ${sourceId} (count=${count})`,
      });
    }
  }

  for (const state of projection) {
    if (state.evidenceStatus === "conflicting" && state.assertionState !== "conflicting") {
      issues.push({
        invariant: "world_projection.conflict_not_promoted_to_truth",
        message: `Çelişkili proposition truth gibi projekte edildi: ${state.propositionKey}`,
      });
    }
    if (state.lifecycle.state !== "unknown") {
      const lifecycleIds = new Set(state.lifecycle.evidenceObservationIds);
      const propositionIds = new Set(state.evidenceObservationIds);
      if ([...lifecycleIds].some((id) => !propositionIds.has(id))) {
        issues.push({
          invariant: "world_projection.lifecycle_evidence_same_proposition",
          message: `Lifecycle başka proposition evidence'ı kullandı: ${state.propositionKey}`,
        });
      }
    }
  }

  return issues;
}
