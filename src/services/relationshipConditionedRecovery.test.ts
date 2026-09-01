import { describe, expect, it } from "vitest";
import { recoverRelationshipConditionedState } from "./relationshipConditionedRecovery";
import { DEFAULT_TEMPERAMENT_PROFILE } from "./temperamentEngine";

const base = {
  elapsedMinutes: 120,
  state: { anger: 60, stress: 60, happiness: 40, calmness: 40 },
  relationship: { hurt: 25, conflict: 20, repairProgress: 0, conversationState: "distancing" as const },
  repairSignal: false,
  temperament: DEFAULT_TEMPERAMENT_PROFILE,
};

describe("relationship-conditioned recovery", () => {
  it("lets irritation lose anger faster than hurt loses stress", () => {
    const irritated = recoverRelationshipConditionedState({ ...base, reactionMode: "irritated" });
    const hurt = recoverRelationshipConditionedState({ ...base, reactionMode: "hurt" });
    expect(irritated.state.anger).toBeLessThan(hurt.state.stress);
    expect(irritated.state.anger).toBeLessThan(60);
    expect(hurt.state.stress).toBeGreaterThan(irritated.state.stress);
  });

  it("keeps withdrawal sticky without a repair signal", () => {
    const result = recoverRelationshipConditionedState({ ...base, reactionMode: "withdrawn" });
    expect(result.reactionMode).toBe("withdrawn");
    expect(result.rationale).toContain("withdrawal-persists-without-repair");
  });

  it("allows withdrawal to become repairing only with sufficient repair and lower injury", () => {
    const result = recoverRelationshipConditionedState({
      ...base,
      reactionMode: "withdrawn",
      repairSignal: true,
      relationship: { hurt: 10, conflict: 8, repairProgress: 45, conversationState: "repairing" },
    });
    expect(result.reactionMode).toBe("repairing");
  });

  it("makes active repairing recover faster than passive hurt", () => {
    const hurt = recoverRelationshipConditionedState({ ...base, reactionMode: "hurt" });
    const repairing = recoverRelationshipConditionedState({
      ...base,
      reactionMode: "repairing",
      repairSignal: true,
      relationship: { hurt: 25, conflict: 20, repairProgress: 50, conversationState: "repairing" },
    });
    expect(repairing.state.stress).toBeLessThan(hurt.state.stress);
    expect(repairing.state.anger).toBeLessThan(hurt.state.anger);
  });

  it("uses temperament recovery speed as a low-level rate modulator", () => {
    const slow = recoverRelationshipConditionedState({ ...base, reactionMode: "irritated", temperament: { ...DEFAULT_TEMPERAMENT_PROFILE, recoverySpeed: 10 } });
    const fast = recoverRelationshipConditionedState({ ...base, reactionMode: "irritated", temperament: { ...DEFAULT_TEMPERAMENT_PROFILE, recoverySpeed: 90 } });
    expect(fast.state.anger).toBeLessThan(slow.state.anger);
  });
});
