import { describe, expect, it } from "vitest";
import { applyConversationStateAuthority } from "./conversationStateAuthority";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

const personality = {
  humor: 80,
  runtimeContinueConversation: 100,
  runtimeHumorAllowed: 100,
  runtimeAskQuestion: 100,
  runtimeStance: 0,
  runtimeWarmth: 90,
  runtimeDistance: 0,
  runtimePriority: 20,
} as unknown as DroitPersonalityTraits;

const state = (conversationState: "active" | "distancing" | "disengaged" | "repairing") => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  relationship: { conversationState },
}) as DroitDynamicState;

describe("conversationStateAuthority", () => {
  it("leaves active state unlocked", () => {
    const result = applyConversationStateAuthority(personality, state("active"));
    expect(result.locked).toBe(false);
    expect(result.personality.runtimeHumorAllowed).toBe(100);
  });

  it("prevents a pre-KDM warm client decision from reopening distancing", () => {
    const result = applyConversationStateAuthority(personality, state("distancing"));
    expect(result.locked).toBe(true);
    expect(result.personality.runtimeHumorAllowed).toBe(0);
    expect(result.personality.runtimeStance).toBeGreaterThanOrEqual(75);
    expect(result.personality.runtimeWarmth).toBeLessThanOrEqual(35);
    expect(result.personality.runtimeDistance).toBeGreaterThanOrEqual(60);
  });

  it("keeps repairing controlled instead of restoring normal closeness", () => {
    const result = applyConversationStateAuthority(personality, state("repairing"));
    expect(result.personality.runtimeContinueConversation).toBe(100);
    expect(result.personality.runtimeHumorAllowed).toBe(0);
    expect(result.personality.runtimeAskQuestion).toBe(0);
    expect(result.personality.runtimeWarmth).toBeLessThanOrEqual(24);
  });

  it("makes disengaged a hard post-transition lock", () => {
    const result = applyConversationStateAuthority(personality, state("disengaged"));
    expect(result.personality.runtimeContinueConversation).toBe(0);
    expect(result.personality.runtimeHumorAllowed).toBe(0);
    expect(result.personality.runtimeAskQuestion).toBe(0);
    expect(result.personality.runtimeStance).toBe(100);
    expect(result.personality.runtimeDistance).toBe(100);
  });
});
