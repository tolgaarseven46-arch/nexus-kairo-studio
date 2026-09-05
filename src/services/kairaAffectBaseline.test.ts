import { describe, expect, it } from "vitest";
import {
  DEFAULT_KAIRA_AFFECT_BASELINE,
  normalizeKairaAffectBaseline,
} from "./kairaAffectBaseline";

describe("Kaira affect baseline", () => {
  it("preserves the shipped reducer baseline when no owner supplies one", () => {
    expect(normalizeKairaAffectBaseline()).toEqual({
      anger: 10,
      stress: 20,
      happiness: 70,
      calmness: 70,
    });
    expect(normalizeKairaAffectBaseline()).toEqual(DEFAULT_KAIRA_AFFECT_BASELINE);
  });

  it("normalizes a future instance-owned baseline without leaking invalid values", () => {
    expect(
      normalizeKairaAffectBaseline({
        anger: -20,
        stress: 140,
        happiness: Number.NaN,
        calmness: 55,
      }),
    ).toEqual({
      anger: 0,
      stress: 100,
      happiness: 70,
      calmness: 55,
    });
  });
});
