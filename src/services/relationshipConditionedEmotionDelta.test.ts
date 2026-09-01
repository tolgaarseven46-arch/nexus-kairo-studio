import { describe, expect, it } from "vitest";
import { appraiseRelationshipConditionedEvent } from "./relationshipConditionedAppraisal";

const modulation = {
  repeatEscalation: 1,
  personalityImpact: 1,
  negativeSensitivity: 1,
  angerTrait: 50,
  toleranceMultiplier: 1,
  forgivenessFactor: 1,
};

function input(overrides: any = {}) {
  return {
    event: { kind: "negative", targetsKaira: true, redLine: false, repairSignal: false },
    relationship: {
      closeness: 30, familiarityDays: 1, interactionCount: 2, warmth: 50, trust: 50,
      relationshipQuality: 50, conflict: 5, hurt: 5, repairProgress: 0,
      priorConversationState: "active", conversationState: "active",
    },
    internalState: { anger: 10, stress: 20, calmness: 70 },
    modulation,
    ...overrides,
  } as any;
}

describe("relationship-conditioned emotion delta authority", () => {
  it("maps irritated toward anger-dominant activation", () => {
    const result = appraiseRelationshipConditionedEvent(input());
    expect(result.reactionTendency).toBe("irritated");
    expect(result.emotionDelta.anger).toBeGreaterThan(result.emotionDelta.stress - 2);
    expect(result.emotionDelta.anger).toBeGreaterThan(0);
    expect(result.emotionDelta.calmness).toBeLessThan(0);
  });

  it("maps close-relationship hurt toward sadness/stress rather than anger", () => {
    const result = appraiseRelationshipConditionedEvent(input({
      relationship: { closeness: 80, familiarityDays: 30, interactionCount: 60, warmth: 80, trust: 80, relationshipQuality: 85, conflict: 5, hurt: 8, repairProgress: 0, priorConversationState: "active", conversationState: "active" },
    }));
    expect(result.reactionTendency).toBe("hurt");
    expect(Math.abs(result.emotionDelta.happiness)).toBeGreaterThan(result.emotionDelta.anger);
    expect(result.emotionDelta.stress).toBeGreaterThan(0);
  });

  it("maps damaged relationship withdrawal to low outward anger", () => {
    const result = appraiseRelationshipConditionedEvent(input({
      relationship: { closeness: 55, familiarityDays: 30, interactionCount: 60, warmth: 35, trust: 35, relationshipQuality: 35, conflict: 40, hurt: 45, repairProgress: 0, priorConversationState: "distancing", conversationState: "distancing" },
    }));
    expect(result.reactionTendency).toBe("withdrawn");
    expect(result.emotionDelta.anger).toBeLessThan(result.emotionDelta.stress);
  });

  it("maps active repair toward de-escalation instead of fresh activation", () => {
    const result = appraiseRelationshipConditionedEvent(input({
      event: { kind: "neutral", targetsKaira: false, redLine: false, repairSignal: true },
      relationship: { closeness: 70, familiarityDays: 30, interactionCount: 60, warmth: 60, trust: 60, relationshipQuality: 65, conflict: 25, hurt: 30, repairProgress: 25, priorConversationState: "repairing", conversationState: "repairing" },
      internalState: { anger: 25, stress: 35, calmness: 55, priorReactionMode: "withdrawn" },
    }));
    expect(result.reactionTendency).toBe("repairing");
    expect(result.emotionDelta.anger).toBeLessThanOrEqual(0);
    expect(result.emotionDelta.stress).toBeLessThanOrEqual(0);
    expect(result.emotionDelta.calmness).toBeGreaterThan(0);
  });
});
