import { describe, expect, it } from "vitest";
import {
  computePersonalityTendencyResponse,
  inferPersonalitySituation,
  personalityTendenciesFromFineTune,
} from "./personalityTendencyEngine";

describe("personalityTendencyEngine", () => {
  it("reads personality fine tune parameters", () => {
    const profile = personalityTendenciesFromFineTune({
      "personality.assertion.confidence": 82,
      "personality.assertion.directness": 74,
      "personality.assertion.stubbornness": 35,
      "personality.cognition.analysisDepth": 88,
      "personality.cognition.flexibility": 79,
      "personality.cognition.deciveness": 68,
    });

    expect(profile.confidence).toBe(82);
    expect(profile.analysisDepth).toBe(88);
    expect(profile.cognitiveFlexibility).toBe(79);
  });

  it("raises revision readiness when correction meets high flexibility", () => {
    const response = computePersonalityTendencyResponse(
      {
        confidence: 60,
        directness: 60,
        stubbornness: 25,
        analysisDepth: 75,
        cognitiveFlexibility: 90,
        decisiveness: 60,
      },
      {
        conflict: 0.2,
        ambiguity: 0.4,
        emotionalLoad: 0.1,
        decisionDemand: 0.3,
        correctionSignal: 1,
      },
    );

    expect(response.behaviorSignals.revisionReadiness).toBeGreaterThan(0.7);
    expect(response.effective.stubbornness).toBeLessThan(25);
  });

  it("detects decision and correction contexts independently", () => {
    const decision = inferPersonalitySituation("Sence hangisini seçmeliyim?");
    const correction = inferPersonalitySituation("Hayır yanlış anladın, öyle değil.");

    expect(decision.decisionDemand).toBeGreaterThan(0.8);
    expect(correction.correctionSignal).toBeGreaterThan(0.8);
  });
});
