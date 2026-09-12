import { describe, expect, it } from "vitest";
import {
  computeMotivationResponse,
  motivationsFromFineTune,
} from "./motivationEngine";

describe("motivationEngine", () => {
  it("raises autonomy drive when autonomy is threatened", () => {
    const profile = motivationsFromFineTune({
      "motivation.agency.autonomy": 90,
      "motivation.agency.impact": 70,
    });
    const result = computeMotivationResponse(profile, {
      socialOpportunity: 0,
      rejectionRisk: 0,
      recognitionOpportunity: 0,
      autonomyThreat: 1,
      achievementOpportunity: 0,
      influenceOpportunity: 0,
      uncertainty: 0,
      instability: 0,
    });

    expect(result.drives.autonomyDrive).toBeGreaterThan(0.75);
    expect(result.drives.withdrawalPressure).toBeGreaterThan(0.5);
  });

  it("raises affiliation drive in a social opportunity", () => {
    const profile = motivationsFromFineTune({
      "motivation.social.connection": 90,
      "motivation.social.belonging": 85,
    });
    const result = computeMotivationResponse(profile, {
      socialOpportunity: 1,
      rejectionRisk: 0,
      recognitionOpportunity: 0,
      autonomyThreat: 0,
      achievementOpportunity: 0,
      influenceOpportunity: 0,
      uncertainty: 0,
      instability: 0,
    });

    expect(result.drives.affiliationDrive).toBeGreaterThan(0.75);
    expect(result.drives.approachPressure).toBeGreaterThan(0.2);
  });

  it("raises security drive under uncertainty", () => {
    const profile = motivationsFromFineTune({
      "motivation.security.predictability": 95,
      "motivation.security.stability": 90,
    });
    const result = computeMotivationResponse(profile, {
      socialOpportunity: 0,
      rejectionRisk: 0,
      recognitionOpportunity: 0,
      autonomyThreat: 0,
      achievementOpportunity: 0,
      influenceOpportunity: 0,
      uncertainty: 1,
      instability: 1,
    });

    expect(result.drives.securityDrive).toBeGreaterThan(0.8);
  });
});
