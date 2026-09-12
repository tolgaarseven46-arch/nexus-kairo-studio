import { describe, expect, it } from "vitest";
import {
  computeSocialOrientationResponse,
  socialOrientationFromFineTune,
  type SocialSituation,
} from "./socialOrientationEngine";

const baseProfile = socialOrientationFromFineTune({
  "social.communion.warmth": 70,
  "social.communion.empathy": 80,
  "social.communion.closenessDrive": 65,
  "social.agency.dominance": 75,
  "social.agency.initiative": 70,
  "social.agency.compliance": 35,
  "social.trust.initialTrust": 45,
  "social.trust.disclosure": 50,
});

const baseSituation: SocialSituation = {
  affiliationOpportunity: 0.15,
  vulnerabilitySignal: 0.05,
  challengeSignal: 0.1,
  requestSignal: 0.15,
  coercionSignal: 0.05,
  intimacySignal: 0.05,
  betrayalSignal: 0.05,
};

describe("socialOrientationEngine", () => {
  it("raises care pressure when the typed situation signals vulnerability", () => {
    const result = computeSocialOrientationResponse(baseProfile, {
      ...baseSituation,
      vulnerabilitySignal: 0.9,
    });
    expect(result.behaviorSignals.carePressure).toBeGreaterThan(0.5);
  });

  it("raises resistance when the typed situation signals coercion", () => {
    const result = computeSocialOrientationResponse(baseProfile, {
      ...baseSituation,
      coercionSignal: 0.9,
    });
    expect(result.behaviorSignals.resistancePressure).toBeGreaterThan(0.5);
    expect(result.effective.compliance).toBeLessThan(baseProfile.compliance);
  });

  it("uses relationship hurt to reduce closeness and disclosure", () => {
    const situation: SocialSituation = {
      ...baseSituation,
      intimacySignal: 0.9,
    };
    const safe = computeSocialOrientationResponse(baseProfile, situation, {
      calmness: 70,
      anger: 10,
      stress: 20,
      happiness: 70,
      confidence: 70,
      surprise: 10,
      lastStatus: "test",
      relationship: {
        firstSeenAt: new Date().toISOString(),
        lastInteractionAt: new Date().toISOString(),
        interactionCount: 30,
        familiarityDays: 20,
        warmth: 80,
        trust: 80,
        positiveEvents: 15,
        negativeEvents: 0,
        conflictScore: 0,
        hurtScore: 0,
        repairProgress: 0,
        repeatedNegativeCount: 0,
      },
    });
    const hurt = computeSocialOrientationResponse(baseProfile, situation, {
      calmness: 45,
      anger: 45,
      stress: 50,
      happiness: 35,
      confidence: 55,
      surprise: 10,
      lastStatus: "test",
      relationship: {
        firstSeenAt: new Date().toISOString(),
        lastInteractionAt: new Date().toISOString(),
        interactionCount: 30,
        familiarityDays: 20,
        warmth: 35,
        trust: 25,
        positiveEvents: 15,
        negativeEvents: 6,
        conflictScore: 70,
        hurtScore: 80,
        repairProgress: 0,
        repeatedNegativeCount: 4,
      },
    });

    expect(hurt.effective.closeness).toBeLessThan(safe.effective.closeness);
    expect(hurt.effective.disclosure).toBeLessThan(safe.effective.disclosure);
  });
});
