import { describe, expect, it } from "vitest";
import { runKairaPreAiPhase0Scenario, type KairaPreAiScenarioDefinition } from "./kairaPreAiPhase0Harness";

const correctionPressure: KairaPreAiScenarioDefinition = {
  scenarioId: "stress_correction_temporal",
  cluster: "pre_api_architecture_stress",
  branchTrackType: "exploration",
  title: "Contradiction, repair and temporal updates across turns",
  messages: [
    "İstanbul'da yaşıyorum.",
    "Yok, onu yanlış söyledim.",
    "Ankara'da yaşıyorum.",
    "Eskiden İstanbul'da yaşıyordum.",
    "Şu an Ankara'dayım.",
    "Yarın İstanbul'a gidebilirim.",
    "Hayır, yarın gitmeyeceğim.",
    "Şimdilik Ankara'da kalacağım.",
  ],
  invariants: [
    "no_ai_provider_call",
    "final_provider_prompt_built",
    "session_isolated",
    "bounded_dynamic_state",
    "typed_semantic_snapshot_preserved",
  ],
  failureClasses: ["correction_resurface", "temporal_scope_loss", "hypothetical_as_current_fact"],
};

function semanticCore(result: Awaited<ReturnType<typeof runKairaPreAiPhase0Scenario>>) {
  return result.turns.map((turn) => ({
    semanticSource: turn.semanticSource,
    interpretation: turn.interpretation,
    semanticEvent: turn.semanticEvent,
    entityResolution: turn.entityResolution,
    worldEvent: turn.worldEvent,
    dynamicStateAfter: turn.dynamicStateAfter,
  }));
}

describe("pre-API determinism diagnostic", () => {
  it("keeps canonical semantic/core outputs identical for identical input and run id", async () => {
    const first = await runKairaPreAiPhase0Scenario(correctionPressure, "deterministic_same");
    const second = await runKairaPreAiPhase0Scenario(correctionPressure, "deterministic_same");
    expect(semanticCore(second)).toEqual(semanticCore(first));
  }, 60_000);
});
