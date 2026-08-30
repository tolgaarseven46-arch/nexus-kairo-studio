import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

export type ConversationAuthorityState = "active" | "distancing" | "disengaged" | "repairing";

export interface ConversationStateAuthorityResult {
  state: ConversationAuthorityState;
  personality: DroitPersonalityTraits;
  locked: boolean;
  reason: string;
}

export function applyConversationStateAuthority(
  personality: DroitPersonalityTraits,
  dynamicState?: DroitDynamicState | null,
): ConversationStateAuthorityResult {
  const state = (dynamicState?.relationship?.conversationState ?? "active") as ConversationAuthorityState;
  if (state === "active") {
    return { state, personality, locked: false, reason: "İlişki aktif; state lock yok." };
  }
  if (state === "disengaged") {
    return {
      state,
      personality,
      locked: true,
      reason: "KDM ilişki reducer'ı disengaged üretti; WHAT/WHETHER kapanışı BehaviorContract ve KairaResponsePlan tarafından uygulanır.",
    };
  }
  if (state === "repairing") {
    return {
      state,
      personality,
      locked: true,
      reason: "KDM ilişki reducer'ı repairing üretti; yakınlık ve mizah izinleri canonical plan tarafından sınırlandırılır.",
    };
  }
  return {
    state,
    personality,
    locked: true,
    reason: "KDM ilişki reducer'ı distancing üretti; davranış izinleri canonical plan tarafından sınırlandırılır.",
  };
}
