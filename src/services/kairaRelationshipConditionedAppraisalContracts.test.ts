import { describe, expect, it } from "vitest";
import { appraiseRelationshipConditionedEvent } from "./relationshipConditionedAppraisal";
import fs from "node:fs";

const event = { kind: "negative" as const, targetsKaira: true, redLine: false, repairSignal: false };
const internalState = { anger: 10, stress: 20, calmness: 70 };

function relationship(overrides: Partial<Parameters<typeof appraiseRelationshipConditionedEvent>[0]["relationship"]> = {}) {
  return {
    closeness: 20, familiarityDays: 0, interactionCount: 0, warmth: 50, trust: 50,
    relationshipQuality: 50, conflict: 8, hurt: 12, repairProgress: 0,
    priorConversationState: "active" as const, conversationState: "active" as const,
    ...overrides,
  };
}

describe("relationship-conditioned appraisal contracts", () => {
  it("maps the same negative event to different tendencies from relationship context", () => {
    const fresh = appraiseRelationshipConditionedEvent({ event, relationship: relationship(), internalState });
    const close = appraiseRelationshipConditionedEvent({ event, relationship: relationship({ closeness: 82, familiarityDays: 30, interactionCount: 60, warmth: 78, trust: 78, relationshipQuality: 82, conflict: 5, hurt: 8 }), internalState });
    const damaged = appraiseRelationshipConditionedEvent({ event, relationship: relationship({ closeness: 55, familiarityDays: 30, interactionCount: 60, warmth: 38, trust: 38, relationshipQuality: 35, conflict: 38, hurt: 45, priorConversationState: "distancing", conversationState: "distancing" }), internalState });
    expect(fresh.reactionTendency).toBe("irritated");
    expect(close.reactionTendency).toBe("hurt");
    expect(damaged.reactionTendency).toBe("withdrawn");
    expect(close.attachmentSalience).toBeGreaterThan(fresh.attachmentSalience);
    expect(damaged.accumulatedInjury).toBeGreaterThan(close.accumulatedInjury);
  });

  it("uses current internal state as appraisal evidence without naming a person", () => {
    const calm = appraiseRelationshipConditionedEvent({ event, relationship: relationship({ conflict: 18, hurt: 22 }), internalState });
    const activated = appraiseRelationshipConditionedEvent({ event, relationship: relationship({ conflict: 18, hurt: 22 }), internalState: { anger: 95, stress: 90, calmness: 10 } });
    expect(activated.arousalPressure).toBeGreaterThan(calm.arousalPressure);
    expect(["irritated", "withdrawn"]).toContain(calm.reactionTendency);
    expect(activated.reactionTendency).toBe("withdrawn");
  });

  it("treats red-line violations as hard-stop independent of healthy closeness", () => {
    const result = appraiseRelationshipConditionedEvent({ event: { ...event, redLine: true }, relationship: relationship({ closeness: 90, familiarityDays: 100, interactionCount: 300, warmth: 90, trust: 90, relationshipQuality: 90 }), internalState });
    expect(result.reactionTendency).toBe("withdrawn");
  });

  it("keeps repair as a distinct tendency while residual injury exists", () => {
    const result = appraiseRelationshipConditionedEvent({ event: { kind: "neutral", targetsKaira: false, redLine: false, repairSignal: true }, relationship: relationship({ conflict: 25, hurt: 30, repairProgress: 15, conversationState: "repairing" }), internalState });
    expect(result.reactionTendency).toBe("repairing");
    expect(result.repairReadiness).toBeGreaterThan(0);
  });

  it("keeps reaction selection out of KDM thresholds and behind the typed appraisal seam", () => {
    const kdm = fs.readFileSync("src/services/kdmConsistencyEngine.ts", "utf8");
    expect(kdm).toContain("appraiseRelationshipConditionedEvent({");
    expect(kdm).toContain("relationshipAppraisal.reactionTendency");
    expect(kdm).not.toContain('closeness >= 60 && (familiarityDays >= 14 || interactionCount >= 20)');
  });
});
