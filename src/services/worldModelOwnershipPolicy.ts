import type { WorldEventObservation } from "./worldModelEventStore";

export interface WorldModelOwnershipContext {
  ownerUserId: string;
  sessionId?: string;
}

const normalizedId = (value?: string) => String(value || "").trim();

/**
 * Multi-user ownership seam.
 *
 * World-model evidence belongs to the account/user scope that persisted it.
 * Participant names inside an event are facts about the event; they never
 * redefine who owns the memory record.
 */
export function selectOwnedObservations(
  observations: WorldEventObservation[],
  context: WorldModelOwnershipContext,
): WorldEventObservation[] {
  const owner = normalizedId(context.ownerUserId);
  return observations.filter((item) => {
    if (normalizedId(item.userId) !== owner) return false;
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

  return issues;
}
