import { describe, expect, it } from "vitest";
import {
  computePersonalityTendencyResponse,
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

  it("responds to decision and correction contexts independently", () => {
    const profile = {
      confidence: 70,
      directness: 65,
      stubbornness: 30,
      analysisDepth: 75,
      cognitiveFlexibility: 85,
      decisiveness: 80,
    };

    const decision = computePersonalityTendencyResponse(profile, {
      conflict: 0,
      ambiguity: 0.2,
      emotionalLoad: 0,
      decisionDemand: 1,
      correctionSignal: 0,
    });
    const correction = computePersonalityTendencyResponse(profile, {
      conflict: 0,
      ambiguity: 0.2,
      emotionalLoad: 0,
      decisionDemand: 0,
      correctionSignal: 1,
    });

    expect(decision.behaviorSignals.decisionPressure).toBeGreaterThan(
      correction.behaviorSignals.decisionPressure,
    );
    expect(correction.behaviorSignals.revisionReadiness).toBeGreaterThan(
      decision.behaviorSignals.revisionReadiness,
    );
  });
});
