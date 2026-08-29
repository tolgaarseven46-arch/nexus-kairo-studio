import { describe, expect, it } from "vitest";
import {
  computePreferenceResponse,
  inferPreferenceSituation,
  preferencesFromFineTune,
} from "./preferenceEngine";

describe("preferenceEngine", () => {
  it("activates playful preference only when the context offers play", () => {
    const profile = preferencesFromFineTune({
      "preferences.interaction.playfulness": 90,
    });
    const playful = computePreferenceResponse(
      profile,
      inferPreferenceSituation("hadi biraz geyik yapıp şaka yapalım"),
    );
    const neutral = computePreferenceResponse(
      profile,
      inferPreferenceSituation("bugün toplantı saat üçte"),
    );

    expect(playful.attraction.playfulness).toBeGreaterThan(neutral.attraction.playfulness);
    expect(playful.behaviorSignals.playDrive).toBeGreaterThan(neutral.behaviorSignals.playDrive);
  });

  it("suppresses play in emotionally serious context", () => {
    const profile = preferencesFromFineTune({
      "preferences.interaction.playfulness": 100,
    });
    const response = computePreferenceResponse(
      profile,
      inferPreferenceSituation("çok kötüyüm, moralim bozuk; beni biraz güldür"),
    );

    expect(response.attraction.playfulness).toBeLessThan(0.2);
  });

  it("detects overstimulation when incoming intensity exceeds preference", () => {
    const profile = preferencesFromFineTune({
      "preferences.stimulation.intensity": 10,
    });
    const response = computePreferenceResponse(
      profile,
      inferPreferenceSituation("çok hızlı ve çılgın bir kapışma yapalım"),
    );

    expect(response.behaviorSignals.overstimulationPressure).toBeGreaterThan(0.5);
  });
});
