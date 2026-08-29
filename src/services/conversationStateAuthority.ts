import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

export type ConversationAuthorityState = "active" | "distancing" | "disengaged" | "repairing";

export interface ConversationStateAuthorityResult {
  state: ConversationAuthorityState;
  personality: DroitPersonalityTraits;
  locked: boolean;
  reason: string;
}

const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const readNumber = (personality: DroitPersonalityTraits, key: string, fallback: number) => {
  const value = (personality as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

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
        runtimeContinueConversation: 0,
        runtimeHumorAllowed: 0,
        runtimeAskQuestion: 0,
        runtimeRepairAllowed: 0,
        runtimeStance: 100,
        runtimeResponseLength: 25,
        runtimeWarmth: 0,
        runtimeDistance: 100,
        runtimePriority: 100,
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
        runtimeContinueConversation: 100,
        runtimeHumorAllowed: 0,
        runtimeAskQuestion: 0,
        runtimeStance: Math.max(75, readNumber(base, "runtimeStance", 75)),
        runtimeResponseLength: 25,
        runtimeWarmth: Math.min(24, readNumber(base, "runtimeWarmth", 24)),
        runtimeDistance: Math.max(70, readNumber(base, "runtimeDistance", 70)),
        runtimePriority: Math.max(65, readNumber(base, "runtimePriority", 65)),
      },
    };
  }

  return {
    state,
    locked: true,
    reason: "KDM ilişki reducer'ı distancing üretti; sıcak/oyuncu client kararı bastırıldı.",
    personality: {
      ...base,
      humor: Math.min(20, clamp100(readNumber(base, "humor", 0))),
      runtimeHumorAllowed: 0,
      runtimeStance: Math.max(75, readNumber(base, "runtimeStance", 75)),
      runtimeWarmth: Math.min(35, readNumber(base, "runtimeWarmth", 35)),
      runtimeDistance: Math.max(60, readNumber(base, "runtimeDistance", 60)),
      runtimePriority: Math.max(65, readNumber(base, "runtimePriority", 65)),
    },
  };
}
