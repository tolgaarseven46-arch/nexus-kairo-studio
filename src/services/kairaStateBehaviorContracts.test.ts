import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";
import { buildBehaviorContract } from "./behaviorContract";
import { projectConversationStateLock } from "./conversationStateLock";
import {
  validateDynamicStateContract,
  validateStateBehaviorSeam,
} from "./kairaStateBehaviorContracts";

const personality: DroitPersonalityTraits = {
  anger: 50,
  patience: 50,
  empathy: 50,
  emotionalSensitivity: 50,
  socialIntelligence: 50,
  selfConfidence: 50,
  humor: 70,
  communication: 50,
  charisma: 50,
  curiosity: 50,
  analyticalThinking: 50,
  creativity: 50,
  decisionMaking: 50,
  attention: 50,
  authority: 50,
  courage: 50,
  seriousness: 50,
  loyalty: 50,
  initiative: 50,
};

const state = (
  conversationState: "active" | "distancing" | "disengaged" | "repairing",
): DroitDynamicState => ({
  calmness: 70,
  anger: 20,
  stress: 30,
  happiness: 60,
  confidence: 70,
  surprise: 10,
  lastStatus: "test",
  relationship: {
    conversationState,
    warmth: conversationState === "active" ? 60 : 30,
    trust: 50,
    conflictScore: conversationState === "active" ? 0 : 35,
    hurtScore: conversationState === "active" ? 0 : 35,
    repairProgress: conversationState === "repairing" ? 20 : 0,
    interactionCount: 10,
    repeatedNegativeCount: 0,
    repairAttempts: conversationState === "repairing" ? 1 : 0,
  },
});

describe("Kaira state -> behavior architecture contracts", () => {
  it("keeps all dynamic and relationship scores inside canonical ranges", () => {
    expect(validateDynamicStateContract(state("active")).accepted).toBe(true);

    const broken = state("active");
    broken.anger = 140;
    expect(validateDynamicStateContract(broken).accepted).toBe(false);
  });

  for (const conversationState of ["active", "distancing", "disengaged", "repairing"] as const) {
    it(`keeps ${conversationState} state aligned across authority and behavior policy`, () => {
      const dynamicState = state(conversationState);
      const stateLock = projectConversationStateLock(dynamicState);
      const behavior = buildBehaviorContract(dynamicState);
      const report = validateStateBehaviorSeam({ state: dynamicState, behavior, stateLock });
      expect(report.issues).toEqual([]);
      expect(report.accepted).toBe(true);
    });
  }

  it("locks conversation reopening in disengaged state", () => {
    const dynamicState = state("disengaged");
    const stateLock = projectConversationStateLock(dynamicState);
    const behavior = buildBehaviorContract(dynamicState);

    expect(stateLock.locked).toBe(true);
        expect(behavior.continueConversation).toBe(false);
    expect(behavior.questions).toBe("forbidden");
    expect(behavior.playfulness).toBe("forbidden");
  });

  it("does not grant forgiveness while repair is still in progress", () => {
    const dynamicState = state("repairing");
    const behavior = buildBehaviorContract(dynamicState);
    expect(behavior.forgivenessGranted).toBe(false);
    expect(behavior.reopeningCloseness).toBe("forbidden");
    expect(behavior.repairStatus).toBe("repairing");
  });
});
