import { describe, expect, it } from "vitest";
import matrix from "../../config/kairaPreAiPhase0Scenarios.json";
import { runKairaPreAiPhase0Scenario, type KairaPreAiScenarioDefinition } from "./kairaPreAiPhase0Harness";

describe("Kaira Phase 0 deterministic pre-AI scenario harness", () => {
  it("runs the full approved matrix without invoking a semantic/model provider", async () => {
    const results = [];
    for (const scenario of matrix.scenarios as KairaPreAiScenarioDefinition[]) {
      results.push(await runKairaPreAiPhase0Scenario(scenario, "ci"));
    }

    expect(results).toHaveLength(21);
    expect(results.reduce((sum, item) => sum + item.turns.length, 0)).toBe(423);
    expect(new Set(results.map((item) => item.userId)).size).toBe(21);
    expect(new Set(results.map((item) => item.sessionId)).size).toBe(21);

    for (const result of results) {
      expect(result.branchTrackType).toBe("regression");
      expect(result.toolingNotes).toContain("no_ai_provider_called");
      expect(result.toolingNotes).toContain("semantic_ingestion=deterministic_regex_floor");
      for (const turn of result.turns) {
        expect(turn.semanticSource).toBe("fallback_regex");
        expect(turn.audit.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
        expect(turn.audit.sessionIsolationCheck.isolated).toBe(true);
        expect(turn.audit.finalPromptSnapshot.system).toContain("STOP: FINAL PROVIDER PROMPT BOUNDARY / NO MODEL CALL");
      }
    }
  }, 30_000);

  it("keeps regression and future exploration identity in the data model", async () => {
    const base = matrix.scenarios.find((item) => item.scenarioId === "A5") as KairaPreAiScenarioDefinition;
    const exploration = { ...base, scenarioId: "A5X", branchTrackType: "exploration" as const };
    const result = await runKairaPreAiPhase0Scenario(exploration, "branching-proof");
    expect(result.branchTrackType).toBe("exploration");
    expect(result.turns.every((turn) => turn.audit.branchTrackType === "exploration")).toBe(true);
  });
});
