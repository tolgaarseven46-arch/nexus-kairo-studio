import { describe, expect, it } from "vitest";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";

const baseState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
};

const healthyEstablished = {
  ...baseState,
  relationship: {
    firstSeenAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    familiarityDays: 30,
    interactionCount: 60,
    warmth: 80,
    trust: 80,
    positiveEvents: 20,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: "active",
    repairAttempts: 0,
  },
} as any;

const alreadyDamaged = {
  ...baseState,
  relationship: {
    firstSeenAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    familiarityDays: 30,
    interactionCount: 60,
    warmth: 40,
    trust: 40,
    positiveEvents: 3,
    negativeEvents: 5,
    conflictScore: 30,
    hurtScore: 35,
    repairProgress: 0,
    repeatedNegativeCount: 1,
    conversationState: "active",
    repairAttempts: 0,
  },
} as any;

describe("relationship-dependent qualitative reaction characterization", () => {
  it("processes the same insult more tolerantly in a healthy established relationship", () => {
    const healthy = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const damaged = analyzeKdmInteraction("salak", undefined, alreadyDamaged);

    const healthyHurtDelta = (healthy.nextDynamicState.relationship?.hurtScore ?? 0) - healthyEstablished.relationship.hurtScore;
    const damagedHurtDelta = (damaged.nextDynamicState.relationship?.hurtScore ?? 0) - alreadyDamaged.relationship.hurtScore;
    const healthyConflictDelta = (healthy.nextDynamicState.relationship?.conflictScore ?? 0) - healthyEstablished.relationship.conflictScore;
    const damagedConflictDelta = (damaged.nextDynamicState.relationship?.conflictScore ?? 0) - alreadyDamaged.relationship.conflictScore;

    expect(healthy.trace.relationship.toleranceMultiplier).toBeLessThan(damaged.trace.relationship.toleranceMultiplier);
    expect(healthyHurtDelta).toBeLessThan(damagedHurtDelta);
    expect(healthyConflictDelta).toBeLessThan(damagedConflictDelta);
    expect(healthy.nextDynamicState.relationship?.conversationState).toBe("active");
    expect(damaged.nextDynamicState.relationship?.conversationState).toBe("distancing");
  });

  it("keeps red-line violations severe even in a healthy established relationship", () => {
    const result = analyzeKdmInteraction("orospu", undefined, healthyEstablished);
    expect(result.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThanOrEqual(10);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThanOrEqual(7);
  });

  it("produces distinct relationship behavior instructions from the same insult", () => {
    const healthy = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const damaged = analyzeKdmInteraction("salak", undefined, alreadyDamaged);

    expect(healthy.behaviorProfile.relationshipInstruction).not.toBe(damaged.behaviorProfile.relationshipInstruction);
    expect(healthy.behaviorProfile.relationshipInstruction).toContain("sıcak ve güvenli");
    expect(damaged.behaviorProfile.relationshipInstruction).toMatch(/gerilimli|hasarlı/i);
  });

  it("does not claim an explicit anger-vs-withdrawal reaction-mode selector that the engine does not yet expose", () => {
    const result = analyzeKdmInteraction("salak", undefined, healthyEstablished) as any;
    expect(result.nextDynamicState.reactionMode).toBeUndefined();
    expect(result.trace.decision.reactionMode).toBeUndefined();
  });
});
