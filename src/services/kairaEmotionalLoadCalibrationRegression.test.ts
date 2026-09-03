import { describe, expect, it } from "vitest";
import { semanticSentimentToKdm } from "./kdmConsistencyEngine";
import {
  interpretationFromRegexFloor,
  projectLegacySemanticEvent,
} from "./semanticInterpretationLegacyProjection";

describe("emotional load calibration regression", () => {
  it("does not let uncertain LLM load turn ordinary greeting into duygusal_yük", () => {
    const base = interpretationFromRegexFloor("selam");
    const noisyLlm = {
      ...base,
      emotionalLoad: 0.8,
      uncertainty: { ...base.uncertainty, overall: 0.75 },
      evidence: [{ source: "llm" as const, provider: "test", cues: ["weak-emotion-guess"], confidence: 0.9 }],
    };

    const event = projectLegacySemanticEvent(noisyLlm, "selam");
    expect(event.emotionalLoad).toBe(0);
    expect(semanticSentimentToKdm(event)).not.toBe("duygusal_yük");
  });

  it("keeps trusted mild emotion observable without promoting it to coarse KDM load", () => {
    const base = interpretationFromRegexFloor("bugün değişik hissediyorum");
    const trustedMild = {
      ...base,
      emotionalLoad: 0.45,
      uncertainty: { ...base.uncertainty, overall: 0.25 },
      evidence: [{ source: "llm" as const, provider: "test", cues: ["explicit-feeling"], confidence: 0.82 }],
    };

    const event = projectLegacySemanticEvent(trustedMild, "bugün değişik hissediyorum");
    expect(event.emotionalLoad).toBe(0.45);
    expect(semanticSentimentToKdm(event)).not.toBe("duygusal_yük");
  });

  it("promotes trusted salient emotion at the 0.6 boundary", () => {
    const base = interpretationFromRegexFloor("bugün değişik hissediyorum");
    const trustedSalient = {
      ...base,
      emotionalLoad: 0.6,
      uncertainty: { ...base.uncertainty, overall: 0.25 },
      evidence: [{ source: "llm" as const, provider: "test", cues: ["explicit-emotional-share"], confidence: 0.82 }],
    };

    const event = projectLegacySemanticEvent(trustedSalient, "bugün değişik hissediyorum");
    expect(event.emotionalLoad).toBe(0.6);
    expect(semanticSentimentToKdm(event)).toBe("duygusal_yük");
  });

  it("preserves deterministic low-mood evidence regardless of LLM uncertainty", () => {
    const base = interpretationFromRegexFloor("bugün moralim çok bozuk ya");
    const uncertainLlm = {
      ...base,
      uncertainty: { ...base.uncertainty, overall: 0.95 },
      evidence: [{ source: "llm" as const, provider: "test", cues: [], confidence: 0.1 }],
    };

    const event = projectLegacySemanticEvent(uncertainLlm, "bugün moralim çok bozuk ya");
    expect(event.emotionalLoad).toBeGreaterThanOrEqual(0.8);
    expect(semanticSentimentToKdm(event)).toBe("duygusal_yük");
  });
});
