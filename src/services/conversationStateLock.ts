import type { DroitDynamicState } from "../types/nexus";

export type ConversationStateLockState =
  | "active"
  | "distancing"
  | "disengaged"
  | "repairing";

export interface ConversationStateLockResult {
  state: ConversationStateLockState;
  locked: boolean;
  reason: string;
}

export function projectConversationStateLock(
  dynamicState?: DroitDynamicState | null,
): ConversationStateLockResult {
  const state = (dynamicState?.relationship?.conversationState ?? "active") as ConversationStateLockState;

  if (state === "active") {
    return {
      state,
      locked: false,
      reason: "İlişki aktif; state lock yok.",
    };
  }

  if (state === "disengaged") {
    return {
      state,
      locked: true,
      reason: "KDM ilişki reducer'ı disengaged üretti; WHAT/WHETHER kapanışı BehaviorContract ve KairaResponsePlan tarafından uygulanır.",
    };
  }

  if (state === "repairing") {
    return {
      state,
      locked: true,
      reason: "KDM ilişki reducer'ı repairing üretti; yakınlık ve mizah izinleri canonical plan tarafından sınırlandırılır.",
    };
  }

  return {
    state,
    locked: true,
    reason: "KDM ilişki reducer'ı distancing üretti; davranış izinleri canonical plan tarafından sınırlandırılır.",
  };
}
