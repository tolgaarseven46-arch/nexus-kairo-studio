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
    return { state, personality, locked: false, reason: "İlişki aktif; post-transition override yok." };
  }

  const base: DroitPersonalityTraits = { ...personality };

  if (state === "disengaged") {
    return {
      state,
      locked: true,
      reason: "KDM ilişki reducer'ı disengaged üretti; önceki client davranış kararı geçersiz kılındı.",
      personality: {
        ...base,
        humor: 0,
      },
    };
  }

  if (state === "repairing") {
    return {
      state,
      locked: true,
      reason: "KDM ilişki reducer'ı repairing üretti; normal yakınlık ve mizah yeniden açılamaz.",
      personality: {
        ...base,
        humor: 0,
      },
    };
  }

  return {
    state,
    locked: true,
    reason: "KDM ilişki reducer'ı distancing üretti; sıcak/oyuncu client kararı bastırıldı.",
    personality: {
      ...base,
      humor: Math.min(20, base.humor ?? 0),
    },
  };
}
