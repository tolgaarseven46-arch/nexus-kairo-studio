import { describe, expect, it } from "vitest";
import {
  DEFAULT_KAIRA_AFFECT_BASELINE,
  kairaAffectBaselineFromFineTune,
  normalizeKairaAffectBaseline,
} from "./kairaAffectBaseline";

describe("Kaira affect baseline", () => {
  it("preserves the shipped reducer baseline when no owner supplies one", () => {
    expect(normalizeKairaAffectBaseline()).toEqual({ anger: 10, stress: 20, happiness: 70, calmness: 70 });
    expect(normalizeKairaAffectBaseline()).toEqual(DEFAULT_KAIRA_AFFECT_BASELINE);
  });

  it("normalizes character-owned affect values", () => {
    expect(normalizeKairaAffectBaseline({ anger: -20, stress: 140, happiness: Number.NaN, calmness: 55 }))
      .toEqual({ anger: 0, stress: 100, happiness: 70, calmness: 55 });
  });

  it("derives resting affect only from dedicated stable fine-tune keys", () => {
    expect(kairaAffectBaselineFromFineTune({
      "temperament.affectBaseline.anger": 18,
      "temperament.affectBaseline.stress": 31,
      "temperament.affectBaseline.happiness": 64,
      "temperament.affectBaseline.calmness": 58,
      "temperament.arousal.baseline": 99,
    })).toEqual({ anger: 18, stress: 31, happiness: 64, calmness: 58 });
  });

  it("does not reinterpret temperament arousal baseline as resting affect", () => {
    expect(kairaAffectBaselineFromFineTune({ "temperament.arousal.baseline": 100 }))
      .toEqual(DEFAULT_KAIRA_AFFECT_BASELINE);
  });
});
