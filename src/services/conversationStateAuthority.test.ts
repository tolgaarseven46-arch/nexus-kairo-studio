import { describe, expect, it } from "vitest";
import { applyConversationStateAuthority } from "./conversationStateAuthority";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

const personality = {
  humor: 80,
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
    expect(result.personality.humor).toBe(80);
  });

  it("locks distancing without mutating response personality", () => {
    const result = applyConversationStateAuthority(personality, state("distancing"));
    expect(result.locked).toBe(true);
    expect(result.personality).toBe(personality);
    expect(result.personality.humor).toBe(80);
  });

  it("locks repairing without mutating response personality", () => {
    const result = applyConversationStateAuthority(personality, state("repairing"));
    expect(result.locked).toBe(true);
    expect(result.personality).toBe(personality);
    expect(result.personality.humor).toBe(80);
  });

  it("makes disengaged a hard state lock without mutating response personality", () => {
    const result = applyConversationStateAuthority(personality, state("disengaged"));
    expect(result.locked).toBe(true);
    expect(result.personality).toBe(personality);
    expect(result.personality.humor).toBe(80);
  });
});
