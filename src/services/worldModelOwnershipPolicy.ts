import {
  observationKairaInstanceId,
  type WorldEventObservation,
} from "./worldModelEventStore";
import {
  DEFAULT_KAIRA_INSTANCE_ID,
  resolveKairaInstanceContext,
} from "./kairaInstanceContext";

export interface WorldModelOwnershipContext {
  ownerUserId: string;
  kairaInstanceId?: string;
  sessionId?: string;
}

const normalizedId = (value?: string) => String(value || "").trim();

/**
 * Multi-user + multi-Kaira ownership seam.
 *
 * World-model evidence belongs to both the account/user scope and the Kaira
 * instance that experienced it. Participant names never redefine ownership.
 */
export function selectOwnedObservations(
  observations: WorldEventObservation[],
  context: WorldModelOwnershipContext,
): WorldEventObservation[] {
  const owner = normalizedId(context.ownerUserId);
  const instanceId = resolveKairaInstanceContext({
    instanceId: context.kairaInstanceId || DEFAULT_KAIRA_INSTANCE_ID,
  }).instanceId;
  return observations.filter((item) => {
    if (normalizedId(item.userId) !== owner) return false;
    if (observationKairaInstanceId(item) !== instanceId) return false;
    if (context.sessionId && item.sessionId !== context.sessionId) return false;
    return true;
  });
}

export interface WorldModelOwnershipIssue {
  invariant: string;
  message: string;
}

export function validateWorldModelOwnership(
  observations: WorldEventObservation[],
  context: WorldModelOwnershipContext,
): WorldModelOwnershipIssue[] {
  const issues: WorldModelOwnershipIssue[] = [];
  const owner = normalizedId(context.ownerUserId);
  const instanceId = resolveKairaInstanceContext({
    instanceId: context.kairaInstanceId || DEFAULT_KAIRA_INSTANCE_ID,
  }).instanceId;

  if (!owner) {
    issues.push({
      invariant: "ownership.owner_required",
      message: "World-model ownerUserId boş olamaz.",
    });
    return issues;
  }

  for (const item of observations) {
    if (!normalizedId(item.userId)) {
      issues.push({
        invariant: "ownership.observation_owner_required",
        message: `Observation owner eksik: ${item.event.raw}`,
      });
    }
    if (!normalizedId(item.sessionId)) {
      issues.push({
        invariant: "ownership.session_required",
        message: `Observation sessionId eksik: ${item.event.raw}`,
      });
    }
  }

  const selected = selectOwnedObservations(observations, context);
  if (selected.some((item) => normalizedId(item.userId) !== owner)) {
    issues.push({
      invariant: "ownership.cross_user_isolation",
      message: "Ownership filtresi başka kullanıcıya ait evidence döndürdü.",
    });
  }
  if (selected.some((item) => observationKairaInstanceId(item) !== instanceId)) {
    issues.push({
      invariant: "ownership.cross_instance_isolation",
      message: "Ownership filtresi başka Kaira instance'ına ait evidence döndürdü.",
    });
  }

  return issues;
}
