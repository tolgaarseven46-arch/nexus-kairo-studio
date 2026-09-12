import { describe, expect, it } from "vitest";
import {
  computePreferenceResponse,
  preferencesFromFineTune,
  type PreferenceSituation,
} from "./preferenceEngine";

const baseSituation: PreferenceSituation = {
  noveltyOpportunity: 0.08,
  complexityOpportunity: 0.08,
  intensityLevel: 0.12,
  depthOpportunity: 0.08,
  playOpportunity: 0.08,
  competitionOpportunity: 0.08,
  emotionalSeriousness: 0.05,
};

describe("preferenceEngine", () => {
  it("activates playful preference only when the typed context offers play", () => {
    const profile = preferencesFromFineTune({
      "preferences.interaction.playfulness": 90,
    });
    const playful = computePreferenceResponse(profile, {
      ...baseSituation,
      playOpportunity: 0.9,
    });
    const neutral = computePreferenceResponse(profile, baseSituation);

    expect(playful.attraction.playfulness).toBeGreaterThan(neutral.attraction.playfulness);
    expect(playful.behaviorSignals.playDrive).toBeGreaterThan(neutral.behaviorSignals.playDrive);
  });

  it("suppresses play in emotionally serious typed context", () => {
    const profile = preferencesFromFineTune({
      "preferences.interaction.playfulness": 100,
    });
    const response = computePreferenceResponse(profile, {
      ...baseSituation,
      playOpportunity: 0.9,
      emotionalSeriousness: 0.95,
    });

    expect(response.attraction.playfulness).toBeLessThan(0.2);
  });

  it("detects overstimulation when incoming typed intensity exceeds preference", () => {
    const profile = preferencesFromFineTune({
      "preferences.stimulation.intensity": 10,
    });
    const response = computePreferenceResponse(profile, {
      ...baseSituation,
      intensityLevel: 0.95,
    });

    expect(response.behaviorSignals.overstimulationPressure).toBeGreaterThan(0.5);
  });
});
