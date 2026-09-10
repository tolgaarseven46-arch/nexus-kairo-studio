import type { DroitDynamicState, RelationshipState } from "../types/nexus";

export interface KdmEffectiveStateSelectionInput {
  requestState: DroitDynamicState;
  persistedState: DroitDynamicState | null;
  requestHasRelationship: boolean;
}

function relationshipTimestamp(relationship: Readonly<RelationshipState> | undefined): number | null {
  const value = relationship?.lastInteractionAt;
  if (typeof value !== "string") return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function interactionCount(relationship: Readonly<RelationshipState> | undefined): number {
  const value = relationship?.interactionCount;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Selects the most advanced relationship-bearing state at the server boundary.
 *
 * Durable persistence is not blindly authoritative: a genuinely newer request may
 * win. But merely carrying a relationship object can no longer make an older tab
 * rewind a more recent persisted relationship state.
 */
export function selectEffectiveKdmDynamicState(
  input: Readonly<KdmEffectiveStateSelectionInput>,
): DroitDynamicState {
  const { requestState, persistedState, requestHasRelationship } = input;
  if (!persistedState?.relationship) return requestState;
  if (!requestHasRelationship || !requestState.relationship) return persistedState;

  const requestTimestamp = relationshipTimestamp(requestState.relationship);
  const persistedTimestamp = relationshipTimestamp(persistedState.relationship);

  if (requestTimestamp !== null && persistedTimestamp !== null && requestTimestamp !== persistedTimestamp) {
    return requestTimestamp > persistedTimestamp ? requestState : persistedState;
  }
  if (requestTimestamp === null && persistedTimestamp !== null) return persistedState;
  if (requestTimestamp !== null && persistedTimestamp === null) return requestState;

  const requestCount = interactionCount(requestState.relationship);
  const persistedCount = interactionCount(persistedState.relationship);
  if (requestCount !== persistedCount) {
    return requestCount > persistedCount ? requestState : persistedState;
  }

  // Exact ties resolve to the durable snapshot so a stale client cannot overwrite
  // state that the server has already accepted and persisted.
  return persistedState;
}
