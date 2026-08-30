import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import { projectConversationStateLock } from "./conversationStateLock";

const state = (conversationState: "active" | "distancing" | "disengaged" | "repairing") => ({
  calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10,
  relationship: { conversationState },
}) as DroitDynamicState;

describe("conversation state lock projection", () => {
  it("leaves active unlocked", () => {
    const result = projectConversationStateLock(state("active"));
    expect(result.locked).toBe(false);
  });
  it.each(["distancing", "repairing", "disengaged"] as const)("locks %s", (value) => {
    const result = projectConversationStateLock(state(value));
    expect(result.state).toBe(value);
    expect(result.locked).toBe(true);
  });
});
