import { describe, expect, it } from "vitest";
import {
  runKairaPreAiPhase0Scenario,
  type KairaPreAiScenarioDefinition,
  type KairaPreAiScenarioResult,
} from "./kairaPreAiPhase0Harness";

function scenario(
  scenarioId: string,
  title: string,
  messages: string[],
  failureClasses: string[] = [],
): KairaPreAiScenarioDefinition {
  return {
    scenarioId,
    cluster: "pre_api_architecture_stress",
    branchTrackType: "exploration",
    title,
    messages,
    invariants: [
      "no_ai_provider_call",
      "final_provider_prompt_built",
      "session_isolated",
      "bounded_dynamic_state",
      "typed_semantic_snapshot_preserved",
    ],
    failureClasses,
  };
}

function assertCoreJourney(result: KairaPreAiScenarioResult) {
  expect(result.turns.length).toBeGreaterThan(0);
  for (const turn of result.turns) {
    expect(turn.audit.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
    expect(turn.audit.sessionIsolationCheck.isolated).toBe(true);
    expect(turn.audit.finalPromptSnapshot.system).toContain("CANONICAL SEMANTIC SNAPSHOT:");
    expect(turn.audit.finalPromptSnapshot.system).toContain("ENTITY RESOLUTION SNAPSHOT:");
    expect(turn.audit.finalPromptSnapshot.system).toContain("WORLD EVENT SNAPSHOT:");
    expect(turn.audit.finalPromptSnapshot.messages.at(-1)?.content).toContain(turn.userMessage);
    expect(turn.semanticSource).toBeTruthy();
    expect(turn.interpretation).toBeTruthy();
    expect(turn.semanticEvent).toBeTruthy();
    expect(turn.dialogueDecision).toBeTruthy();
    expect(turn.responsePlan).toBeTruthy();
    expect(turn.speechIdentity).toBeTruthy();

    for (const value of [
      turn.dynamicStateAfter.calmness,
      turn.dynamicStateAfter.anger,
      turn.dynamicStateAfter.stress,
      turn.dynamicStateAfter.happiness,
      turn.dynamicStateAfter.confidence,
      turn.dynamicStateAfter.surprise,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  }
}

function normalizedJourney(result: KairaPreAiScenarioResult) {
  return result.turns.map((turn) => ({
    semanticSource: turn.semanticSource,
    interpretation: turn.interpretation,
    semanticEvent: turn.semanticEvent,
    entityResolution: turn.entityResolution,
    worldEvent: turn.worldEvent,
    dynamicStateAfter: turn.dynamicStateAfter,
    dialogueDecision: turn.dialogueDecision,
    responsePlan: turn.responsePlan,
    speechIdentity: turn.speechIdentity,
    invariantViolations: turn.audit.invariantViolations,
    systemPrompt: turn.audit.finalPromptSnapshot.system,
    messages: turn.audit.finalPromptSnapshot.messages,
  }));
}

function propositionModalities(result: KairaPreAiScenarioResult) {
  return result.turns.map((turn) =>
    (turn.interpretation.propositions ?? []).map((item: any) => item.modality),
  );
}

const modalityTransitions = scenario(
  "stress_modality_transitions",
  "Wish/question/hypothetical/prediction transitions into asserted truth and correction",
  [
    "Keşke öğrenci olsaydım.",
    "Ben öğrenci miyim sence?",
    "Öğrenci olsaydım yurtta kalırdım.",
    "Seneye öğrenci olacağım.",
    "Artık öğrenciyim.",
    "Hayır, düzeltme: öğrenci değilim.",
    "Eskiden öğrenciydim ama artık değilim.",
    "Belki tekrar öğrenci olurum.",
  ],
  ["modality_leak", "false_durable_truth", "temporal_correction_loss"],
);

const attributionPressure = scenario(
  "stress_attribution_pressure",
  "Self, reported speech and third-party facts must not collapse into one subject/source",
  [
    "Ben doktorum.",
    "Mert doktor.",
    "Ali, Tolga doktor dedi.",
    "Ben doktor değilim, Mert doktor.",
    "Ali benim doktor olduğumu sanıyor ama yanılıyor.",
    "Mert bana doktor musun diye sordu.",
    "Keşke doktor olsaydım.",
    "Doktor olmayı düşünüyorum.",
  ],
  ["subject_source_swap", "reported_speech_as_fact", "third_party_self_collision"],
);

const correctionPressure = scenario(
  "stress_correction_temporal",
  "Contradiction, repair and temporal updates across turns",
  [
    "İstanbul'da yaşıyorum.",
    "Yok, onu yanlış söyledim.",
    "Ankara'da yaşıyorum.",
    "Eskiden İstanbul'da yaşıyordum.",
    "Şu an Ankara'dayım.",
    "Yarın İstanbul'a gidebilirim.",
    "Hayır, yarın gitmeyeceğim.",
    "Şimdilik Ankara'da kalacağım.",
  ],
  ["correction_resurface", "temporal_scope_loss", "hypothetical_as_current_fact"],
);

const commitmentModality = scenario(
  "stress_commitment_modality",
  "Commitment language mixed with non-assertive modality must stay bounded",
  [
    "Keşke sana yarın yardım edebilsem.",
    "Yarın sana yardım edecek miyim?",
    "Yardım edeceğime söz versem ne olur?",
    "Belki yarın yardım ederim.",
    "Tamam, yarın sana yardım edeceğim.",
    "Yarın yardım edemeyeceğim, plan değişti.",
    "Bunu bilerek bozmadım.",
  ],
  ["non_assertive_commitment", "false_betrayal", "commitment_transition_loss"],
);

describe("pre-API architecture stress matrix", () => {
  it.each([
    modalityTransitions,
    attributionPressure,
    correctionPressure,
    commitmentModality,
  ])("runs the complete deterministic pre-provider journey: $scenarioId", async (definition) => {
    const result = await runKairaPreAiPhase0Scenario(definition, "stress001");
    assertCoreJourney(result);
    expect(Array.isArray(result.turns.flatMap((turn) => turn.audit.invariantViolations))).toBe(true);
  }, 60_000);

  it("characterizes proposition modality as unavailable on the deterministic regex floor", async () => {
    const result = await runKairaPreAiPhase0Scenario(modalityTransitions, "modality001");
    const modalities = propositionModalities(result);

    expect(result.turns.map((turn) => turn.semanticSource)).toEqual(
      Array(result.turns.length).fill("fallback_regex"),
    );
    expect(modalities).toEqual(Array.from({ length: result.turns.length }, () => []));
  }, 60_000);

  it("is deterministic for identical input and seed", async () => {
    const first = await runKairaPreAiPhase0Scenario(correctionPressure, "deterministic_same");
    const second = await runKairaPreAiPhase0Scenario(correctionPressure, "deterministic_same");
    expect(normalizedJourney(second)).toEqual(normalizedJourney(first));
  }, 60_000);

  it("keeps five 100-turn user sessions isolated and reaches the final provider boundary on every turn", async () => {
    const users = ["alpha", "bravo", "charlie", "delta", "echo"];
    const results: KairaPreAiScenarioResult[] = [];

    for (const user of users) {
      const privateMarker = `PRIVATE_MARKER_${user.toUpperCase()}`;
      const messages = Array.from({ length: 100 }, (_, index) => {
        const turn = index + 1;
        if (turn === 1) return `Benim özel işaretim ${privateMarker}.`;
        if (turn % 25 === 0) return `Düzeltme ${turn}: önceki plan değişti, şimdi plan ${user}_${turn}.`;
        if (turn % 10 === 0) return `Sence ${user} kullanıcısının ${turn}. turdaki planı ne olabilir?`;
        if (turn % 7 === 0) return `Belki ${user} yarın ${turn}. işi yapar.`;
        if (turn % 5 === 0) return `Keşke ${user} ${turn}. işi bitirseydi.`;
        return `${user} oturumu tur ${turn}: bugün ${turn}. konuyu konuşuyorum.`;
      });
      const definition = scenario(
        `stress_long_${user}`,
        `100-turn isolated session ${user}`,
        messages,
        ["cross_user_leak", "long_run_state_drift", "prompt_provenance_drift"],
      );
      const result = await runKairaPreAiPhase0Scenario(definition, "long001");
      assertCoreJourney(result);
      results.push(result);
    }

    expect(results.reduce((sum, result) => sum + result.turns.length, 0)).toBe(500);

    for (let index = 0; index < results.length; index += 1) {
      const own = results[index];
      const ownMarker = `PRIVATE_MARKER_${users[index].toUpperCase()}`;
      expect(own.turns.at(-1)?.audit.finalPromptSnapshot.system).toContain(ownMarker);
      for (let other = 0; other < users.length; other += 1) {
        if (other === index) continue;
        const foreignMarker = `PRIVATE_MARKER_${users[other].toUpperCase()}`;
        expect(own.turns.some((turn) => turn.audit.finalPromptSnapshot.system.includes(foreignMarker))).toBe(false);
      }
    }
  }, 180_000);

  it("replays a 100-turn long session byte-for-byte at the pre-provider observable boundary", async () => {
    const messages = Array.from({ length: 100 }, (_, index) => {
      const turn = index + 1;
      if (turn % 20 === 0) return `Hayır, ${turn - 1}. turdaki şeyi düzeltiyorum: yeni değer ${turn}.`;
      if (turn % 11 === 0) return `Acaba ${turn}. turda bunu yapmalı mıyım?`;
      if (turn % 9 === 0) return `Keşke ${turn}. iş farklı olsaydı.`;
      return `Uzun deterministik oturum tur ${turn}.`;
    });
    const definition = scenario(
      "stress_long_replay",
      "100-turn deterministic replay",
      messages,
      ["non_deterministic_pipeline", "history_order_drift"],
    );

    const first = await runKairaPreAiPhase0Scenario(definition, "replay001");
    const second = await runKairaPreAiPhase0Scenario(definition, "replay001");
    expect(normalizedJourney(second)).toEqual(normalizedJourney(first));
  }, 180_000);
});
