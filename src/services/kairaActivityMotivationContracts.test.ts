import { describe, expect, it } from "vitest";
import { deriveKairaActivityMotivation } from "./kairaActivityMotivation";
import type { DroitDynamicState } from "../types/nexus";

const state = (overrides: Partial<DroitDynamicState> = {}): DroitDynamicState => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "stable",
  ...overrides,
});

describe("Kaira activity motivation contracts", () => {
  it("is deterministic and bounded", () => {
    const input = state({ stress: 80, anger: 30 });
    const context = { availableBandwidth: 0.7, stimulationNeed: 0.4, connectionNeed: 0.6, selfDirectionNeed: 0.8 };
    const left = deriveKairaActivityMotivation(input, context);
    const right = deriveKairaActivityMotivation(input, context);
    expect(left).toEqual(right);
    expect(Object.values(left).every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  });

  it("raises restoration pressure under high strain without naming an activity", () => {
    const calm = deriveKairaActivityMotivation(state({ stress: 5, anger: 5, happiness: 80 }));
    const strained = deriveKairaActivityMotivation(state({ stress: 95, anger: 80, happiness: 15 }));
    expect(strained.rest).toBeGreaterThan(calm.rest);
  });

  it("clamps malformed state and context rather than leaking NaN", () => {
    const malformed = deriveKairaActivityMotivation(
      state({ stress: Number.NaN, confidence: Number.POSITIVE_INFINITY, calmness: -200, happiness: 400 }),
      { availableBandwidth: Number.NaN, stimulationNeed: 9, connectionNeed: -4 },
    );
    expect(Object.values(malformed).every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  });
});
