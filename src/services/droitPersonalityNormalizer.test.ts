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

  it("preserves additional finite numeric traits used by compatibility layers", () => {
    const normalized = normalizeDroitPersonality({ analytical: 77, trust: 64 });
    expect(normalized.analytical).toBe(77);
    expect(normalized.trust).toBe(64);
  });
});
