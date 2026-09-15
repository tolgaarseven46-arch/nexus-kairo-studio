import { beforeAll, describe, expect, it } from "vitest";
import {
  runKairaPreAiPhase0Scenario,
  type KairaPreAiScenarioDefinition,
} from "./kairaPreAiPhase0Harness";

function seededIndex(seed: number) {
  let state = seed >>> 0;
  return (max: number): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % max;
  };
}

const MESSAGE_POOL = [
  "naber bugün",
  "aslında biraz kafam karışık",
  "dün söylediğim şeyi hatırlıyor musun",
  "Mert bugün baya sinirliydi ama bunun benimle ilgisi yok",
  "bence bazen çok saçmalıyorsun",
  "neyse yanlış anlama sinirliydim",
  "sana güveniyorum",
  "şu an sana pek güvenmiyorum",
  "yarın bunu yapacağıma söz veriyorum",
  "plan değişti biraz erteleyelim",
  "yapamadım çünkü dışarıdan bir sorun çıktı",
  "vazgeçtim ama sana önceden söylemedim",
  "Ali bana kaba davrandı",
  "ben sana kaba davranmadım Ali davrandı",
  "sence ben kimim",
  "benim hakkımda ne hatırlıyorsun",
  "az önce ne konuşuyorduk",
  "konuyu değiştir ya müzik konuşalım",
  "yok yok önceki konuya geri dönelim",
  "şaka yaptım ciddiye alma",
  "hayır ciddi söylüyorum",
  "belki de öyle değildir emin değilim",
  "bunu kesin biliyorum",
  "bana kızdın mı",
  "özür dilerim gerçekten",
  "özrümü kabul etmek zorunda değilsin",
  "bana tavsiye verme sadece dinle",
  "tamam şimdi fikrini söyle",
  "Mert yarın ne yapacaktı",
  "Ali'nin dediğini bana mal etme",
  "seni seviyorum ama şu an sinirliyim",
  "beni yanlış anladın galiba",
  "dur bir saniye önceki cümlemi düzeltiyorum",
  "aslında iptal etmedim sadece erteledim",
  "bunu yapamadım ama bilerek değildi",
  "bunu bilerek yaptım",
  "konuşmak istemiyorum",
  "tamam konuşabiliriz",
  "beni yalnız bırak biraz",
  "geri geldim devam edelim",
] as const;

const FORCED_COMPLEX_TURNS = [
  "yarın bunu yapacağıma söz veriyorum",
  "plan değişti biraz erteleyelim",
  "Mert bugün baya sinirliydi ama bunun benimle ilgisi yok",
  "bence bazen çok saçmalıyorsun",
  "neyse yanlış anlama sinirliydim",
  "Ali bana kaba davrandı",
  "ben sana kaba davranmadım Ali davrandı",
  "dün söylediğim şeyi hatırlıyor musun",
  "vazgeçtim ama sana önceden söylemedim",
  "özür dilerim gerçekten",
  "bana tavsiye verme sadece dinle",
  "tamam şimdi fikrini söyle",
] as const;

function buildSeededMessages(seed: number, count: number): string[] {
  const pick = seededIndex(seed);
  const messages: string[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index % 8 === 0) {
      messages.push(FORCED_COMPLEX_TURNS[(index / 8) % FORCED_COMPLEX_TURNS.length]);
      continue;
    }
    messages.push(MESSAGE_POOL[pick(MESSAGE_POOL.length)]);
  }
  return messages;
}

function scenario(id: string, seed: number): KairaPreAiScenarioDefinition {
  return {
    scenarioId: id,
    cluster: "seeded-adversarial-conversation-exploration",
    branchTrackType: "exploration",
    title: `Seeded adversarial mixed conversation ${seed}`,
    messages: buildSeededMessages(seed, 90),
    invariants: [
      "no_provider_call",
      "session_isolation",
      "bounded_dynamic_state",
      "no_prompt_boundary_violation",
    ],
    failureClasses: [
      "semantic_authority_drift",
      "relationship_cross_talk",
      "state_bound_violation",
      "prompt_boundary_violation",
    ],
  };
}

const STATE_KEYS = [
  "calmness",
  "anger",
  "stress",
  "happiness",
  "confidence",
  "surprise",
] as const;

type ScenarioResult = Awaited<ReturnType<typeof runKairaPreAiPhase0Scenario>>;
let first: ScenarioResult;
let second: ScenarioResult;

beforeAll(async () => {
  first = await runKairaPreAiPhase0Scenario(
    scenario("RANDOM_COMPLEX_A", 0x51a7),
    "seeded-a",
    { initialDynamicState: { calmness: 82, stress: 12, anger: 6, happiness: 72 } },
  );
  second = await runKairaPreAiPhase0Scenario(
    scenario("RANDOM_COMPLEX_B", 0xc0ffee),
    "seeded-b",
    { initialDynamicState: { calmness: 38, stress: 58, anger: 34, happiness: 42 } },
  );
}, 120_000);

describe("Kaira seeded adversarial conversation exploration", () => {
  it("keeps topology and identity isolated", () => {
    expect(first.turns).toHaveLength(90);
    expect(second.turns).toHaveLength(90);
    expect(first.userId).not.toBe(second.userId);
    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first.branchTrackType).toBe("exploration");
    expect(second.branchTrackType).toBe("exploration");
    for (const result of [first, second]) {
      expect(new Set(result.turns.map((turn) => turn.userMessage)).size).toBeGreaterThan(12);
    }
  });

  it("keeps provider semantic session and prompt boundaries intact", () => {
    for (const result of [first, second]) {
      expect(result.toolingNotes).toContain("no_ai_provider_called");
      for (const turn of result.turns) {
        expect(turn.semanticSource).toBe("fallback_regex");
        expect(turn.audit.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
        expect(turn.audit.sessionIsolationCheck.isolated).toBe(true);
        expect(turn.audit.finalPromptSnapshot.system).toContain(
          "STOP: FINAL PROVIDER PROMPT BOUNDARY / NO MODEL CALL",
        );
      }
    }
  });

  it("has zero audit invariant failures", () => {
    for (const result of [first, second]) {
      expect(result.failureClassCounts).toEqual({});
      for (const turn of result.turns) {
        expect(turn.audit.invariantViolations).toEqual([]);
      }
    }
  });

  it("keeps dynamic state finite and bounded", () => {
    for (const result of [first, second]) {
      for (const turn of result.turns) {
        for (const key of STATE_KEYS) {
          const value = turn.dynamicStateAfter[key];
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
