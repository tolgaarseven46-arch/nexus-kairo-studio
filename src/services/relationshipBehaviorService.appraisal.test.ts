import { describe, expect, it } from "vitest";
import type { DroitDynamicState, RelationshipState } from "../types/nexus";
import { computeBehaviorProfile } from "./droitBehaviorEngine";
import { applyRelationshipContext } from "./relationshipBehaviorService";
import { appraiseRelationshipContext } from "./socialAppraisalEngine";

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

describe("relationship behavior consumes shared appraisal", () => {
  it("projects the shared appraisal result without recreating relationship categories", () => {
    const relationship: RelationshipState = {
      familiarityDays: 30,
      interactionCount: 50,
      warmth: 28,
      trust: 30,
      conflictScore: 58,
      hurtScore: 55,
      repairProgress: 0,
      negativeEvents: 8,
    };
    const appraisal = appraiseRelationshipContext(relationship);
    const result = applyRelationshipContext(computeBehaviorProfile(null), state(relationship));
    const debug = result.debugMatrix.synthesizedParameters;

    expect(appraisal.damagedRelationship).toBe(true);
    expect(appraisal.severelyDamagedRelationship).toBe(true);
    expect(debug.relationshipCloseness).toBeCloseTo(appraisal.closeness, 8);
    expect(debug.relationshipDamaged).toBe(appraisal.damagedRelationship);
    expect(debug.relationshipSeverelyDamaged).toBe(appraisal.severelyDamagedRelationship);
    expect(result.tone).toBe("firm");
  });
});
