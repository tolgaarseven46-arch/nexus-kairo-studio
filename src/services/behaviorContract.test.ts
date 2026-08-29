import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";

const state = (conversationState: "active" | "distancing" | "disengaged" | "repairing", extra: Record<string, unknown> = {}) => ({
  calmness: 60,
  anger: 20,
  stress: 20,
  happiness: 50,
  confidence: 60,
  surprise: 10,
  relationship: {
    conversationState,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
    ...extra,
  },
}) as any;

describe("buildBehaviorContract", () => {
  it("keeps healthy active conversation open", () => {
    const c = buildBehaviorContract(state("active"));
    expect(c.playfulness).toBe("allowed");
    expect(c.forgivenessGranted).toBe(true);
  });

  it("forbids playful reopening while distancing", () => {
    const c = buildBehaviorContract(state("distancing", { hurtScore: 31, repairProgress: 9 }));
    expect(c.playfulness).toBe("forbidden");
    expect(c.reopeningCloseness).toBe("forbidden");
    expect(c.forgivenessGranted).toBe(false);
    expect(c.repairStatus).toBe("incomplete");
  });

  it("keeps repairing cautious", () => {
    const c = buildBehaviorContract(state("repairing", { repairAttempts: 2, repairProgress: 25 }));
    expect(c.continueConversation).toBe(true);
    expect(c.affection).toBe("forbidden");
    expect(c.repairStatus).toBe("repairing");
  });

  it("hard closes disengaged state", () => {
    const c = buildBehaviorContract(state("disengaged", { hurtScore: 70 }));
    expect(c.continueConversation).toBe(false);
    expect(c.stance).toBe("closed");
    expect(c.questions).toBe("forbidden");
  });
});
