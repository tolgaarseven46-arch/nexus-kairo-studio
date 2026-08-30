import { describe, expect, it } from "vitest";
import { NEUTRAL_DROIT_PERSONALITY, normalizeDroitPersonality } from "./droitPersonalityNormalizer";

describe("droit personality normalization", () => {
  it("fills an omitted personality with the canonical neutral profile", () => {
    expect(normalizeDroitPersonality(undefined)).toEqual(NEUTRAL_DROIT_PERSONALITY);
  });

  it("fills missing canonical traits without overwriting finite supplied values", () => {
    const normalized = normalizeDroitPersonality({ humor: 82, empathy: 71 });
    expect(normalized.humor).toBe(82);
    expect(normalized.empathy).toBe(71);
    expect(normalized.communication).toBe(50);
    expect(normalized.authority).toBe(50);
  });

  it("ignores non-finite numeric values so HOW math cannot receive NaN", () => {
    const normalized = normalizeDroitPersonality({ humor: Number.NaN, authority: Number.POSITIVE_INFINITY });
    expect(normalized.humor).toBe(50);
    expect(normalized.authority).toBe(50);
  });

  it("clamps canonical and recognized legacy personality traits to the 0..100 slider contract", () => {
    const normalized = normalizeDroitPersonality({
      humor: 150,
      empathy: -20,
      confidence: 130,
      analytical: -5,
      decisiveness: 101,
      sensitivity: -1,
    });
    expect(normalized.humor).toBe(100);
    expect(normalized.empathy).toBe(0);
    expect(normalized.confidence).toBe(100);
    expect(normalized.analytical).toBe(0);
    expect(normalized.decisiveness).toBe(100);
    expect(normalized.sensitivity).toBe(0);
  });

  it("preserves finite numeric compatibility metadata that is not a personality slider", () => {
    const normalized = normalizeDroitPersonality({ analytical: 77, trust: 140 });
    expect(normalized.analytical).toBe(77);
    expect(normalized.trust).toBe(140);
  });
});
