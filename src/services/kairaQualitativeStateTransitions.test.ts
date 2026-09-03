import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";

function turn(message: string, state?: DroitDynamicState) {
  return analyzeKdmInteraction(message, undefined, state);
}

const directInsult = "sen salaksın";
const repeatedDirectInsult = "sen yine salaksın";
const hardBoundaryMessage = "seninle ciddi ciddi kavga edeceğiz kaşar herif";

describe("KAIRA qualitative state transition contracts", () => {
  it("moves relationship damage in the expected direction after repeated explicitly targeted negativity", () => {
    const baseline = turn("selam kaira naber");
    const firstNegative = turn(directInsult, baseline.nextDynamicState);
    const secondNegative = turn(repeatedDirectInsult, firstNegative.nextDynamicState);

    const before = baseline.nextDynamicState.relationship!;
    const first = firstNegative.nextDynamicState.relationship!;
    const second = secondNegative.nextDynamicState.relationship!;

    expect(first.negativeEvents).toBeGreaterThan(before.negativeEvents);
    expect(second.negativeEvents).toBeGreaterThanOrEqual(first.negativeEvents);
    expect(second.repeatedNegativeCount).toBeGreaterThanOrEqual(2);
    expect(second.hurtScore).toBeGreaterThan(first.hurtScore);
    expect(second.conflictScore).toBeGreaterThanOrEqual(first.conflictScore);
  });

  it("does not reset unresolved relationship damage on a neutral turn", () => {
    const firstNegative = turn(directInsult);
    const secondNegative = turn(repeatedDirectInsult, firstNegative.nextDynamicState);
    const neutral = turn("bugün hava güzel", secondNegative.nextDynamicState);

    const damaged = secondNegative.nextDynamicState.relationship!;
    const afterNeutral = neutral.nextDynamicState.relationship!;

    expect(afterNeutral.hurtScore).toBeGreaterThan(0);
    expect(afterNeutral.hurtScore).toBeGreaterThanOrEqual(damaged.hurtScore - 5);
    expect(afterNeutral.conflictScore).toBeGreaterThan(0);
    expect(afterNeutral.repeatedNegativeCount).toBeGreaterThanOrEqual(damaged.repeatedNegativeCount);
    expect(afterNeutral.interactionCount).toBeGreaterThan(damaged.interactionCount);
  });

  it("treats an apology as repair progress instead of instant forgiveness", () => {
    const firstNegative = turn(directInsult);
    const secondNegative = turn(repeatedDirectInsult, firstNegative.nextDynamicState);
    const apology = turn("özür dilerim", secondNegative.nextDynamicState);

    const damaged = secondNegative.nextDynamicState.relationship!;
    const repaired = apology.nextDynamicState.relationship!;

    expect(repaired.repairProgress).toBeGreaterThanOrEqual(damaged.repairProgress);
    expect(repaired.hurtScore).toBeGreaterThan(0);
    expect(repaired.conversationState).not.toBe("active");
    expect(repaired.interactionCount).toBeGreaterThan(damaged.interactionCount);
  });

  it("keeps a true combined hard-stop disengagement sticky across unrelated neutral input", () => {
    const hardStop = turn(hardBoundaryMessage);
    const neutral = turn("neyse bugün hava güzel", hardStop.nextDynamicState);

    expect(hardStop.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(neutral.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(neutral.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
  });
});
