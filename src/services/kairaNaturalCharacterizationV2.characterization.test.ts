import { describe, expect, it } from "vitest";
import {
  naturalCharacterizationV2Scenarios,
  runKairaNaturalCharacterizationV2,
} from "./kairaNaturalCharacterizationV2";

describe("Natural Characterization v2", () => {
  it("keeps the evolving v2 corpus separate, labeled, API-free and bounded", () => {
    const scenarios = naturalCharacterizationV2Scenarios();
    expect(scenarios).toHaveLength(10);
    expect(new Set(scenarios.map((item) => item.scenarioId)).size).toBe(10);
    expect(new Set(scenarios.map((item) => item.openQuestionId)).size).toBe(10);

    for (const scenario of scenarios) {
      expect(scenario.openQuestionId.trim().length).toBeGreaterThan(0);
      expect(scenario.openQuestion.trim().length).toBeGreaterThan(0);
      expect(scenario.messages.length).toBeGreaterThanOrEqual(20);
      expect(scenario.messages.length).toBeLessThanOrEqual(30);
    }

    const paired = scenarios.find((item) => item.scenarioId === "S9");
    expect(paired?.variants?.map((item) => item.variantId)).toEqual([
      "fresh_fragile",
      "established_trusting",
    ]);
  });

  it("runs the complete corpus through the deterministic pre-provider core and emits classifications", async () => {
    const report = await runKairaNaturalCharacterizationV2("vitest");

    expect(report.providerCalls).toBe(false);
    expect(report.baselineRegressionCorpusModified).toBe(false);
    expect(report.scenarioCount).toBe(10);
    expect(report.executionCount).toBe(11); // S9 has two seeded variants.
    expect(report.turnCount).toBe(220);

    for (const execution of report.executions) {
      expect(execution.openQuestionId.length).toBeGreaterThan(0);
      expect(execution.turns.length).toBeGreaterThanOrEqual(20);
      expect(execution.turns.every((turn) => turn.openQuestionId === execution.openQuestionId)).toBe(true);
      expect(execution.turns.every((turn) => turn.responsePlan.resolver === "canonical")).toBe(true);
      expect(execution.turns.every((turn) => turn.semanticSource !== "provider")).toBe(true);
    }

    // Hard-oracle scenarios must resolve to a decision, not remain generic observations.
    for (const scenarioId of ["S5", "S7", "S8", "S9"]) {
      const executions = report.executions.filter((item) => item.scenarioId === scenarioId);
      expect(executions.length).toBeGreaterThan(0);
      expect(executions.every((item) => item.classification !== "OBSERVATION")).toBe(true);
    }
  }, 30_000);
});
