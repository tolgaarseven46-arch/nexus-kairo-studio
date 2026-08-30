import { describe, expect, it } from "vitest";
import { integrateBehaviorLayers } from "./behaviorIntegrationEngine";
import type { DroitPersonalityTraits } from "../types/nexus";

const basePersonality = {
  humor: 70,
  authority: 50,
  empathy: 60,
  patience: 60,
  seriousness: 40,
  communication: 60,
} as DroitPersonalityTraits;

const base = () => ({
  personality: basePersonality,
  userMessage: "naber",
  dynamicState: {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 60,
    confidence: 70,
    surprise: 10,
    lastStatus: "normal",
  },
  personalityTendency: {
    behaviorSignals: {
      assertivePressure: 0.4,
      analysisPressure: 0.3,
      revisionReadiness: 0.5,
      decisionPressure: 0.4,
    },
  },
  motivation: {
    drives: {
      affiliationDrive: 0.5,
      approvalDrive: 0.3,
      autonomyDrive: 0.4,
      achievementDrive: 0.4,
      influenceDrive: 0.3,
      securityDrive: 0.4,
      approachPressure: 0.45,
      withdrawalPressure: 0.1,
    },
  },
  values: {
    behaviorSignals: {
      moralObjection: 0.05,
      protectivePressure: 0.05,
      autonomyDefense: 0.05,
      boundaryPressure: 0.05,
      accountabilityPressure: 0.05,
    },
  },
  preferences: {
    behaviorSignals: {
      engagementDrive: 0.45,
      explorationDrive: 0.3,
      depthDrive: 0.25,
      playDrive: 0.5,
      competitionDrive: 0.1,
      overstimulationPressure: 0,
    },
  },
  social: {
    behaviorSignals: {
      affiliationPressure: 0.65,
      carePressure: 0.45,
      leadershipPressure: 0.25,
      resistancePressure: 0.1,
      disclosurePressure: 0.4,
      socialDistancePressure: 0.05,
    },
  },
  boundaries: {
    hardStop: false,
    violationPressure: 0.05,
    behaviorSignals: {
      boundaryAssertion: 0.05,
      distancePressure: 0.05,
      escalationPressure: 0.02,
      repairOpenness: 0,
      disengagementPressure: 0.03,
    },
  },
  expression: {
    humor: { enabled: true, dominantMode: "affiliative", strength: 0.7 },
    speech: {
      brevity: 0.3,
      informality: 0.7,
      emotionalDisplay: 0.5,
      questionDrive: 0.5,
    },
    inhibition: 0.1,
  },
}) as any;

describe("behavior integration", () => {
  it("lets friendly expression survive when higher-priority pressures are low", () => {
    const result = integrateBehaviorLayers(base());
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.humorAllowed).toBe(true);
    expect(result.decision.stance).not.toBe("disengage");
  });

  it("lets a severe boundary override humor and engagement", () => {
    const input = base();
    input.boundaries.violationPressure = 0.95;
    input.boundaries.behaviorSignals.boundaryAssertion = 0.95;
    input.boundaries.behaviorSignals.distancePressure = 0.9;
    input.boundaries.behaviorSignals.escalationPressure = 0.7;
    input.boundaries.behaviorSignals.disengagementPressure = 0.9;

    const result = integrateBehaviorLayers(input);
    expect(result.decision.priority).toBe("boundary");
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.personality.humor).toBe(0);
  });

  it("forces an absolute hard stop even when the character sliders are permissive", () => {
    const input = base();
    input.boundaries.hardStop = true;
    input.boundaries.violationPressure = 1;
    input.boundaries.behaviorSignals.boundaryAssertion = 1;
    input.boundaries.behaviorSignals.distancePressure = 1;
    input.boundaries.behaviorSignals.escalationPressure = 1;
    input.boundaries.behaviorSignals.disengagementPressure = 1;

    const result = integrateBehaviorLayers(input);
    expect(result.decision.priority).toBe("boundary");
    expect(result.decision.stance).toBe("disengage");
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.repairAllowed).toBe(false);
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.priority).toBe("boundary");
  });

  it("obeys a direct request to stop asking questions without ending the conversation", () => {
    const input = base();
    input.userMessage = "hala soruyorsun lan soru sorma artık";

    const result = integrateBehaviorLayers(input);
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.askQuestion).toBe(false);
    expect(result.decision.acknowledgeComplaint).toBe(true);
    expect(result.decision.askQuestion).toBe(false);
  });

  it("does not let a repair attempt instantly erase accumulated relationship damage", () => {
    const input = base();
    input.dynamicState.relationship = {
      hurtScore: 80,
      conflictScore: 70,
      warmth: 30,
      trust: 25,
      interactionCount: 20,
    };
    input.boundaries.violationPressure = 0.7;
    input.boundaries.behaviorSignals.boundaryAssertion = 0.75;
    input.boundaries.behaviorSignals.distancePressure = 0.8;
    input.boundaries.behaviorSignals.disengagementPressure = 0.65;
    input.boundaries.behaviorSignals.repairOpenness = 0.25;
    input.social.behaviorSignals.socialDistancePressure = 0.75;

    const result = integrateBehaviorLayers(input);
    expect(result.decision.distance).toBeGreaterThan(result.decision.warmth);
    expect(result.decision.humorAllowed).toBe(false);
  });
});
