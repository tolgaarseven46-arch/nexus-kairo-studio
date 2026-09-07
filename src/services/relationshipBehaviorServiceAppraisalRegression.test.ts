import { describe, expect, it } from "vitest";
import type { DroitDynamicState, RelationshipState } from "../types/nexus";
import { computeBehaviorProfile } from "./droitBehaviorEngine";
import { applyRelationshipContext } from "./relationshipBehaviorService";

function state(relationship: RelationshipState): DroitDynamicState {
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: "fixture",
    reactionMode: "neutral",
    relationship,
  };
}

describe("relationship behavior shared-appraisal regression", () => {
  it("preserves distinct new, friendly and severely damaged projections", () => {
    const base = computeBehaviorProfile(null);

    const fresh = applyRelationshipContext(base, state({
      familiarityDays: 1,
      interactionCount: 1,
      warmth: 50,
      trust: 50,
      conflictScore: 0,
      hurtScore: 0,
      repairProgress: 0,
    }));
    expect(fresh.debugMatrix.synthesizedParameters.relationshipDamaged).toBe(false);
    expect(fresh.dominantSummary).toContain("gelişen ilişki");

    const friendly = applyRelationshipContext(base, state({
      familiarityDays: 30,
      interactionCount: 50,
      warmth: 82,
      trust: 85,
      conflictScore: 5,
      hurtScore: 4,
      repairProgress: 0,
      positiveEvents: 8,
    }));
    expect(friendly.debugMatrix.synthesizedParameters.relationshipDamaged).toBe(false);
    expect(friendly.debugMatrix.synthesizedParameters.relationshipCloseness).toBeGreaterThan(0.55);

    const damaged = applyRelationshipContext(base, state({
      familiarityDays: 30,
      interactionCount: 50,
      warmth: 28,
      trust: 30,
      conflictScore: 58,
      hurtScore: 55,
      repairProgress: 0,
      negativeEvents: 8,
    }));
    expect(damaged.debugMatrix.synthesizedParameters.relationshipDamaged).toBe(true);
    expect(damaged.debugMatrix.synthesizedParameters.relationshipSeverelyDamaged).toBe(true);
    expect(damaged.tone).toBe("firm");
  });
});
