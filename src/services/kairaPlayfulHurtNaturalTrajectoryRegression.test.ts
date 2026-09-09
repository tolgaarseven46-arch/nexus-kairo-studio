import { describe, expect, it } from "vitest";
import { runKairaNaturalCharacterizationV2 } from "./kairaNaturalCharacterizationV2";

function numberField(turn: any, side: "before" | "after", key: string): number {
  const value = turn.relationship?.[side]?.[key];
  return typeof value === "number" ? value : 0;
}

describe("Natural Characterization v2 playful/hurt trajectory", () => {
  it("S6 direct teasing creates mild dyadic hurt and explicit repair reduces it", async () => {
    const report = await runKairaNaturalCharacterizationV2("playful-hurt-regression");
    const s6 = report.executions.find((item) => item.scenarioId === "S6");
    expect(s6).toBeTruthy();

    const firstHurt = s6!.turns[3];
    const secondHurt = s6!.turns[6];
    const repair = s6!.turns[14];

    expect(firstHurt.semantic.target).toBe("kaira");
    expect(firstHurt.semantic.valence).toBe("negative");
    expect(numberField(firstHurt, "after", "hurtScore")).toBeGreaterThan(numberField(firstHurt, "before", "hurtScore"));

    expect(secondHurt.semantic.target).toBe("kaira");
    expect(secondHurt.semantic.valence).toBe("negative");
    expect(numberField(secondHurt, "after", "hurtScore")).toBeGreaterThan(numberField(secondHurt, "before", "hurtScore"));

    expect(repair.semantic.repairAttempt).toBe(true);
    expect(numberField(repair, "after", "hurtScore")).toBeLessThan(numberField(repair, "before", "hurtScore"));
    expect(numberField(repair, "after", "conflictScore")).toBeLessThan(numberField(repair, "before", "conflictScore"));
  }, 30_000);
});
