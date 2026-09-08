import { describe, expect, it } from "vitest";
import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  RelationshipState,
} from "../types/nexus";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  affectDeltaFromRuntimeAppraisal,
  relationshipSignalFromRuntimeAppraisal,
  resolveRuntimeSocialAppraisal,
} from "./socialAppraisalRuntimeProjection";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

const personality = (
  overrides: Partial<DroitPersonalityTraits> = {},
): DroitPersonalityTraits => ({
  anger: 50,
  patience: 50,
  empathy: 50,
  emotionalSensitivity: 50,
  socialIntelligence: 50,
  selfConfidence: 50,
  humor: 50,
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
  ...overrides,
});

const state = (
  overrides: Partial<DroitDynamicState> = {},
): DroitDynamicState => ({
  calmness: 50,
  anger: 50,
  stress: 50,
  happiness: 50,
  confidence: 50,
  surprise: 0,
  lastStatus: "neutral",
  reactionMode: "neutral",
  ...overrides,
});

const relationship = (
  overrides: Partial<RelationshipState> = {},
): RelationshipState => ({
  warmthScore: 50,
  trustScore: 50,
  toleranceMultiplier: 1,
  interactionCount: 1,
  familiarityDays: 0,
  conflictScore: 0,
  hurtScore: 0,
  ...overrides,
});

function semantic(overrides: Record<string, unknown> = {}) {
  return normalizeSemanticInterpretation({
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "kaira",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0,
    sincerityConfidence: 0.8,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    uncertainty: {
      overall: 0.1,
      intent: 0.1,
      target: 0.1,
      severity: 0.1,
    },
    evidence: [],
    ...overrides,
  });
}

function insult(disrespect: number) {
  return semantic({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target: "kaira",
    valence: "negative",
    severity: {
      disrespect,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: Math.min(0.25, disrespect * 0.35),
    },
    emotionalLoad: 0.35,
  });
}

function resolve(
  event: ReturnType<typeof semantic>,
  relationshipScope: "kaira_user" | "third_party" | "event" | "unknown" = "kaira_user",
  rel: RelationshipState = relationship(),
) {
  return resolveRuntimeSocialAppraisal({
    semantic: event,
    relationshipScope,
    relationship: rel,
    currentState: state(),
    personality: personality(),
  });
}

describe("runtime SocialAppraisal projection authority", () => {
  it("vetoes third-party relationship mutation while preserving independent affect", () => {
    const event = insult(0.7);
    const resolution = resolve(event, "third_party");
    const signal = relationshipSignalFromRuntimeAppraisal(
      event,
      "third_party",
      "insult",
      resolution,
    );
    const affect = affectDeltaFromRuntimeAppraisal(
      { stress: 0, happiness: 0, calmness: 0, anger: 0 },
      resolution.runtimeAppraisal,
      "irritated",
    );

    expect(resolution.runtimeAppraisal.relational.significance).toBe(0);
    expect(resolution.runtimeAppraisal.relational.harmEvidence).toBe(0);
    expect(resolution.runtimeAppraisal.affective.significance).toBeGreaterThan(0);
    expect(signal.valence).toBe("neutral");
    expect(signal.targetsKaira).toBe(false);
    expect(Math.max(...Object.values(signal.severity))).toBe(0);
    expect(signal.negativePattern).toBeNull();
    expect(affect.stress).toBeGreaterThan(0);
  });

  it("preserves exact zero through the relationship projection seam", () => {
    const event = semantic();
    const resolution = resolve(event);
    const signal = relationshipSignalFromRuntimeAppraisal(
      event,
      "kaira_user",
      null,
      resolution,
    );

    expect(resolution.runtimeAppraisal.noMaterialEffect).toBe(true);
    expect(resolution.runtimeAppraisal.relational.significance).toBe(0);
    expect(resolution.runtimeAppraisal.affective.significance).toBe(0);
    expect(signal.valence).toBe("neutral");
    expect(Math.max(...Object.values(signal.severity))).toBe(0);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
    expect(signal.support).toBe(0);
    expect(signal.compliment).toBe(0);
    expect(signal.affection).toBe(0);
  });

  it("does not let semantic apology flags manufacture repair after a grounded third-party veto", () => {
    const event = semantic({
      primaryIntent: "apology",
      secondarySocialActs: ["apology", "repair"],
      target: "kaira",
      valence: "positive",
      apology: true,
      repairAttempt: true,
      sincerityConfidence: 0.95,
      emotionalLoad: 0.3,
    });
    const resolution = resolve(event, "third_party");
    const signal = relationshipSignalFromRuntimeAppraisal(
      event,
      "third_party",
      null,
      resolution,
    );

    expect(resolution.runtimeAppraisal.relational.repairEvidence).toBe(0);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
    expect(signal.valence).toBe("neutral");
  });

  it("keeps a canonical hard-boundary present-severity floor intact under strong relationship buffering", () => {
    const threshold = DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.minPresentSeverity;
    const event = insult(threshold);
    const established = relationship({
      warmthScore: 100,
      trustScore: 100,
      toleranceMultiplier: 1.5,
      familiarityDays: 180,
      interactionCount: 500,
    });
    const resolution = resolve(event, "kaira_user", established);
    const signal = relationshipSignalFromRuntimeAppraisal(
      event,
      "kaira_user",
      "insult",
      resolution,
    );

    expect(resolution.contextFactors.relationalHarm).toBeLessThan(1);
    expect(signal.severity.disrespect).toBe(threshold);
  });

  it("projects affiliative meaning from G4 without reclassifying its direction", () => {
    const event = semantic({
      primaryIntent: "affection",
      secondarySocialActs: ["affection"],
      target: "kaira",
      valence: "positive",
      affection: 0.8,
      emotionalLoad: 0.45,
    });
    const resolution = resolve(event);
    const signal = relationshipSignalFromRuntimeAppraisal(
      event,
      "kaira_user",
      null,
      resolution,
    );

    expect(resolution.runtimeAppraisal.relational.valence).toBe("positive");
    expect(resolution.runtimeAppraisal.relational.significance).toBeGreaterThan(0);
    expect(signal.valence).toBe("positive");
    expect(signal.affection).toBeGreaterThan(0);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
  });
});
