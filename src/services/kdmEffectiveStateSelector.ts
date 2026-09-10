import type { DroitDynamicState } from "../types/nexus";

export interface KdmEffectiveStateSelectionInput {
  requestState: DroitDynamicState;
  persistedState: DroitDynamicState | null;
  requestHasRelationship: boolean;
}

/**
 * Extracted form of the current server selection rule.
 * Kept pure so persistence arbitration can be regression-tested independently.
 */
export function selectEffectiveKdmDynamicState(
  input: Readonly<KdmEffectiveStateSelectionInput>,
): DroitDynamicState {
  return input.requestHasRelationship
    ? input.requestState
    : (input.persistedState ?? input.requestState);
}
