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

const newRelationship = {
  ...baseState,
  relationship: {
    firstSeenAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    familiarityDays: 0,
    interactionCount: 0,
    warmth: 50,
    trust: 50,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: "active",
    repairAttempts: 0,
  },
} as any;

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

  it("selects irritated, hurt and withdrawn for the same insult from relationship context", () => {
    const fresh = analyzeKdmInteraction("salak", undefined, newRelationship);
    const close = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const damaged = analyzeKdmInteraction("salak", undefined, alreadyDamaged);

    expect(fresh.nextDynamicState.reactionMode).toBe("irritated");
    expect(close.nextDynamicState.reactionMode).toBe("hurt");
    expect(damaged.nextDynamicState.reactionMode).toBe("withdrawn");
    expect(fresh.trace.currentMood.reactionMode).toBe("irritated");
    expect(close.trace.currentMood.reactionMode).toBe("hurt");
    expect(damaged.trace.currentMood.reactionMode).toBe("withdrawn");
  });

  it("keeps hurt across the first unrelated neutral follow-up while residual injury remains", () => {
    const insult = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const neutral = analyzeKdmInteraction("selam", undefined, insult.nextDynamicState);

    expect(insult.nextDynamicState.reactionMode).toBe("hurt");
    expect(neutral.nextDynamicState.reactionMode).toBe("hurt");
    expect(neutral.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
  });

  it("keeps irritated across the first unrelated neutral follow-up while residual injury remains", () => {
    const insult = analyzeKdmInteraction("salak", undefined, newRelationship);
    const neutral = analyzeKdmInteraction("selam", undefined, insult.nextDynamicState);

    expect(insult.nextDynamicState.reactionMode).toBe("irritated");
    expect(neutral.nextDynamicState.reactionMode).toBe("irritated");
    expect(neutral.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThan(0);
  });

  it("lets a low-level reaction decay to neutral after enough calm neutral interaction", () => {
    const insult = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    let current = insult.nextDynamicState;

    for (let i = 0; i < 40 && current.reactionMode !== "neutral"; i += 1) {
      current = analyzeKdmInteraction("tamam", undefined, current).nextDynamicState;
    }

    expect(current.reactionMode).toBe("neutral");
    expect(current.relationship?.hurtScore ?? 0).toBeLessThan(2);
    expect(current.relationship?.conflictScore ?? 0).toBeLessThan(2);
  });

  it("feeds the qualitative mode into HOW-only relationship behavior directives", () => {
    const fresh = analyzeKdmInteraction("salak", undefined, newRelationship);
    const close = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const damaged = analyzeKdmInteraction("salak", undefined, alreadyDamaged);

    expect(fresh.behaviorProfile.behaviorDirectives.some((item) => item.includes("Nitel tepki irritated"))).toBe(true);
    expect(close.behaviorProfile.behaviorDirectives.some((item) => item.includes("Nitel tepki hurt"))).toBe(true);
    expect(damaged.behaviorProfile.behaviorDirectives.some((item) => item.includes("Nitel tepki withdrawn"))).toBe(true);
  });

  it("exposes the qualitative mode through the canonical relationship instruction used by the AI prompt", () => {
    const fresh = analyzeKdmInteraction("salak", undefined, newRelationship);
    const close = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const damaged = analyzeKdmInteraction("salak", undefined, alreadyDamaged);

    expect(fresh.behaviorProfile.relationshipInstruction).toContain("Nitel tepki irritated");
    expect(close.behaviorProfile.relationshipInstruction).toContain("Nitel tepki hurt");
    expect(damaged.behaviorProfile.relationshipInstruction).toContain("Nitel tepki withdrawn");
  });

  it("keeps red-line violations severe and withdrawn even in a healthy established relationship", () => {
    const result = analyzeKdmInteraction("orospu", undefined, healthyEstablished);
    expect(result.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(result.nextDynamicState.reactionMode).toBe("withdrawn");
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThanOrEqual(10);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThanOrEqual(7);
  });

  it("uses repairing while unresolved hurt is being actively repaired", () => {
    const result = analyzeKdmInteraction("özür dilerim", undefined, alreadyDamaged);
    expect(result.nextDynamicState.reactionMode).toBe("repairing");
    expect(result.trace.currentMood.reactionMode).toBe("repairing");
    expect(result.behaviorProfile.behaviorDirectives.some((item) => item.includes("Nitel tepki repairing"))).toBe(true);
    expect(result.behaviorProfile.relationshipInstruction).toContain("Nitel tepki repairing");
  });

  it("still produces distinct relationship behavior instructions from the same insult", () => {
    const healthy = analyzeKdmInteraction("salak", undefined, healthyEstablished);
    const damaged = analyzeKdmInteraction("salak", undefined, alreadyDamaged);

    expect(healthy.behaviorProfile.relationshipInstruction).not.toBe(damaged.behaviorProfile.relationshipInstruction);
    expect(healthy.behaviorProfile.relationshipInstruction).toContain("sıcak ve güvenli");
    expect(damaged.behaviorProfile.relationshipInstruction).toMatch(/gerilimli|hasarlı/i);
  });
});
