import { describe, expect, it } from "vitest";
import {
  computeMotivationResponse,
  inferMotivationSituation,
  motivationsFromFineTune,
} from "./motivationEngine";

describe("motivationEngine", () => {
  it("raises autonomy drive when autonomy is threatened", () => {
    const profile = motivationsFromFineTune({
      "motivation.agency.autonomy": 90,
      "motivation.agency.impact": 70,
    });
    const situation = inferMotivationSituation("Bunu yapmak zorundasın, dediğimi yap.");
    const result = computeMotivationResponse(profile, situation);

    expect(result.drives.autonomyDrive).toBeGreaterThan(0.75);
    expect(result.drives.withdrawalPressure).toBeGreaterThan(0.5);
  });

  it("raises affiliation drive in a social opportunity", () => {
    const profile = motivationsFromFineTune({
      "motivation.social.connection": 90,
      "motivation.social.belonging": 85,
    });
    const situation = inferMotivationSituation("Kanka biraz beraber konuşalım.");
    const result = computeMotivationResponse(profile, situation);

    expect(result.drives.affiliationDrive).toBeGreaterThan(0.75);
    expect(result.drives.approachPressure).toBeGreaterThan(0.2);
  });

  it("raises security drive under uncertainty", () => {
    const profile = motivationsFromFineTune({
      "motivation.security.predictability": 95,
      "motivation.security.stability": 90,
    });
    const situation = inferMotivationSituation("Ne olacağı belli değil, sistem sürekli değişiyor.");
    const result = computeMotivationResponse(profile, situation);

    expect(result.drives.securityDrive).toBeGreaterThan(0.8);
  });
});
