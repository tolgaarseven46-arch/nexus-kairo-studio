import { describe, expect, it } from "vitest";
import {
  EMOTIONAL_LOAD_POLICY,
  calibrateProjectedEmotionalLoad,
  emotionalLoadBand,
  isKdmSalientEmotionalLoad,
} from "./emotionalLoadPolicy";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

describe("emotional load policy thresholds", () => {
  it("uses explicit none / mild / salient / intense boundaries", () => {
    expect(emotionalLoadBand(0.29)).toBe("none");
    expect(emotionalLoadBand(EMOTIONAL_LOAD_POLICY.projectionMinLoad)).toBe("mild");
    expect(emotionalLoadBand(0.59)).toBe("mild");
    expect(emotionalLoadBand(EMOTIONAL_LOAD_POLICY.salientLoad)).toBe("salient");
    expect(emotionalLoadBand(0.79)).toBe("salient");
    expect(emotionalLoadBand(EMOTIONAL_LOAD_POLICY.intenseLoad)).toBe("intense");
  });

  it("reserves coarse KDM duygusal_yük for salient-or-higher load", () => {
    expect(isKdmSalientEmotionalLoad(0.59)).toBe(false);
    expect(isKdmSalientEmotionalLoad(0.6)).toBe(true);
    expect(isKdmSalientEmotionalLoad(0.8)).toBe(true);
  });

  it("suppresses an uncertain LLM-only load measurement", () => {
    const base = interpretationFromRegexFloor("selam");
    const uncertain = {
      ...base,
      emotionalLoad: 0.8,
      uncertainty: { ...base.uncertainty, overall: 0.7 },
      evidence: [{ source: "llm" as const, provider: "test", cues: [], confidence: 0.9 }],
    };

    expect(calibrateProjectedEmotionalLoad(uncertain, 0)).toBe(0);
  });

  it("accepts a sufficiently confident, sufficiently certain measurement", () => {
    const base = interpretationFromRegexFloor("selam");
    const trusted = {
      ...base,
      emotionalLoad: 0.8,
      uncertainty: { ...base.uncertainty, overall: 0.2 },
      evidence: [{ source: "llm" as const, provider: "test", cues: [], confidence: 0.8 }],
    };

    expect(calibrateProjectedEmotionalLoad(trusted, 0)).toBe(0.8);
  });

  it("never erases an independent deterministic emotional floor", () => {
    const lowMood = interpretationFromRegexFloor("bugün moralim çok bozuk ya");
    const untrusted = {
      ...lowMood,
      emotionalLoad: 0.8,
      uncertainty: { ...lowMood.uncertainty, overall: 0.9 },
      evidence: [{ source: "llm" as const, provider: "test", cues: [], confidence: 0.2 }],
    };

    expect(calibrateProjectedEmotionalLoad(untrusted, 0.8)).toBe(0.8);
  });
});
