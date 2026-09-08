import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, RelationshipState } from "../types/nexus";
import type { SocialAppraisalInput, SocialAppraisalMemoryContext } from "../types/socialAppraisal";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { resolveRuntimeSocialAppraisal } from "./socialAppraisalRuntimeProjection";

const personality = (overrides: Partial<DroitPersonalityTraits> = {}): DroitPersonalityTraits => ({
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50, socialIntelligence: 50,
  selfConfidence: 50, humor: 50, communication: 50, charisma: 50, curiosity: 50,
  analyticalThinking: 50, creativity: 50, decisionMaking: 50, attention: 50, authority: 50,
  courage: 50, seriousness: 50, loyalty: 50, initiative: 50, ...overrides,
});

const state = (overrides: Partial<DroitDynamicState> = {}): DroitDynamicState => ({
  calmness: 50, anger: 50, stress: 50, happiness: 50, confidence: 50, surprise: 0,
  lastStatus: "neutral", reactionMode: "neutral", ...overrides,
});

const relationship = (overrides: Partial<RelationshipState> = {}): RelationshipState => ({
  warmthScore: 50, trustScore: 50, toleranceMultiplier: 1, interactionCount: 1,
  familiarityDays: 0, conflictScore: 0, hurtScore: 0, ...overrides,
});

function semantic(overrides: Record<string, unknown> = {}) {
  return normalizeSemanticInterpretation({
    primaryIntent: "smalltalk", secondarySocialActs: [], target: "kaira", valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0, sincerityConfidence: 0.8, affection: 0, support: 0, compliment: 0,
    emotionalLoad: 0, apology: false, repairAttempt: false,
    uncertainty: { overall: 0.1, intent: 0.1, target: 0.1, severity: 0.1 }, evidence: [],
    ...overrides,
  });
}

function mildInsult() {
  return semantic({
    primaryIntent: "insult", secondarySocialActs: ["insult"], target: "kaira", valence: "negative",
    severity: { disrespect: 0.28, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.08 },
    emotionalLoad: 0.18,
    uncertainty: { overall: 0.18, intent: 0.1, target: 0.05, severity: 0.18 },
  });
}

const deepHistory: SocialAppraisalMemoryContext = {
  autobiographical: {
    participantId: "user:alice", episodeCount: 100, salientEpisodeCount: 100,
    meanSalience: 1, maxSalience: 1, meanEmotionalIntensity: 1,
  },
};

function runtime(overrides: Partial<SocialAppraisalInput> = {}) {
  const input: SocialAppraisalInput = {
    semantic: semantic(), relationship: relationship(), currentState: state(), personality: personality(),
    ...overrides,
  };
  return resolveRuntimeSocialAppraisal({
    semantic: input.semantic, relationshipScope: "kaira_user", relationship: input.relationship,
    dyadicNorm: input.dyadicNorm, memory: input.memory, currentState: input.currentState,
    personality: input.personality,
  });
}

describe("natural-conversation characterization acceptance isolation", () => {
  it("keeps even maximally deep autobiography unable to manufacture effect from a neutral turn", () => {
    const resolved = runtime({ memory: deepHistory });
    expect(resolved.runtimeAppraisal.noMaterialEffect).toBe(true);
    expect(resolved.runtimeAppraisal.relational.significance).toBe(0);
    expect(resolved.runtimeAppraisal.relational.harmEvidence).toBe(0);
    expect(resolved.runtimeAppraisal.relational.repairEvidence).toBe(0);
    expect(resolved.runtimeAppraisal.affective.significance).toBe(0);
    expect(resolved.contextFactors.affectiveNegative).toBe(1);
    expect(resolved.contextFactors.affectivePositive).toBe(1);
    expect(resolved.contextFactors.activation).toBe(1);
  });

  it("bounds history amplification and never lets autobiography alter relational meaning", () => {
    const event = mildInsult();
    const withoutHistory = runtime({ semantic: event });
    const withDeepHistory = runtime({ semantic: event, memory: deepHistory });
    expect(withDeepHistory.runtimeAppraisal.relational).toEqual(withoutHistory.runtimeAppraisal.relational);
    expect(withDeepHistory.runtimeAppraisal.affective.valence).toBe(withoutHistory.runtimeAppraisal.affective.valence);
    expect(withDeepHistory.runtimeAppraisal.affective.significance).toBeGreaterThanOrEqual(withoutHistory.runtimeAppraisal.affective.significance);
    expect(withDeepHistory.contextFactors.affectiveNegative).toBeLessThanOrEqual(1.12);
    expect(withDeepHistory.contextFactors.activation).toBeLessThanOrEqual(1.12);
  });
});
