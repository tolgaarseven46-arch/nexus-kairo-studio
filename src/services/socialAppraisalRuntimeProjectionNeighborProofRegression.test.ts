import { describe, expect, it } from "vitest";
import { computeBehaviorProfile } from "./droitBehaviorEngine";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";
import { analyzeKdmInteractionCanonical } from "./kdmRelationshipReducerBridge";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";

const initialRelationship = {
  warmthScore: 50,
  trustScore: 50,
  warmth: 50,
  trust: 50,
  toleranceMultiplier: 1,
  interactionCount: 4,
  familiarityDays: 2,
  conflictScore: 0,
  hurtScore: 0,
  repairProgress: 0,
  positiveEvents: 0,
  negativeEvents: 0,
  repeatedNegativeCount: 0,
  conversationState: "active",
} as any;

const initialState = {
  calmness: 50,
  anger: 10,
  stress: 20,
  happiness: 50,
  confidence: 50,
  surprise: 0,
  lastStatus: "neutral",
  reactionMode: "neutral",
  relationship: initialRelationship,
} as any;

function semantic(overrides: Record<string, unknown>) {
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
    sincerityConfidence: 0.9,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    uncertainty: {
      overall: 0.05,
      intent: 0.05,
      target: 0.05,
      severity: 0.05,
    },
    evidence: [],
    ...overrides,
  });
}

function run(
  interpretation: ReturnType<typeof semantic>,
  relationshipScope: "kaira_user" | "third_party" | "event",
) {
  const baseBehaviorProfile = computeBehaviorProfile(NEUTRAL_DROIT_PERSONALITY);
  return analyzeKdmInteractionCanonical({
    state: initialState,
    semanticInterpretation: interpretation,
    semanticEvent: { relationshipScope } as any,
    normalizedPersonality: NEUTRAL_DROIT_PERSONALITY,
    baseBehaviorProfile,
    behaviorPolicy: null,
    applyIntegrated: (profile) => profile,
    semanticIntentToKdm: () => "genel_sohbet",
    semanticSentimentToKdm: () => "nötr",
  });
}

const hardNonDyadicInsult = () =>
  semantic({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    valence: "negative",
    emotionalLoad: 0.6,
    severity: {
      disrespect: 0.8,
      coercion: 0.8,
      manipulation: 0,
      privacy: 0,
      aggression: 0.25,
    },
  });

describe("G4 runtime projection authority bug-class neighbor proof", () => {
  it("reported: third-party harm cannot hard-stop the Kaira-user relationship but may affect Kaira", () => {
    const result = run(hardNonDyadicInsult(), "third_party");

    expect(result.nextDynamicState.relationship?.conversationState).toBe("active");
    expect(result.nextDynamicState.relationship?.disengageReason).toBeUndefined();
    expect(result.nextDynamicState.stress).toBeGreaterThan(initialState.stress);
  });

  it("neighbor-1: event-scoped harm cannot hard-stop the Kaira-user relationship", () => {
    const result = run(hardNonDyadicInsult(), "event");

    expect(result.nextDynamicState.relationship?.conversationState).toBe("active");
    expect(result.nextDynamicState.relationship?.disengageReason).toBeUndefined();
  });

  it("neighbor-2: event-scoped affection cannot manufacture dyadic warmth", () => {
    const event = semantic({
      primaryIntent: "affection",
      secondarySocialActs: ["affection"],
      valence: "positive",
      affection: 0.85,
      emotionalLoad: 0.35,
    });
    const result = run(event, "event");

    expect(result.nextDynamicState.relationship?.warmth).toBe(initialRelationship.warmth);
    expect(result.nextDynamicState.relationship?.positiveEvents).toBe(initialRelationship.positiveEvents);
  });

  it("counterexample: genuine Kaira-user affection remains a positive relationship event", () => {
    const event = semantic({
      primaryIntent: "affection",
      secondarySocialActs: ["affection"],
      valence: "positive",
      affection: 0.85,
      emotionalLoad: 0.35,
    });
    const result = run(event, "kaira_user");

    expect(result.nextDynamicState.relationship?.warmth).toBeGreaterThan(initialRelationship.warmth);
    expect(result.nextDynamicState.relationship?.positiveEvents).toBeGreaterThan(initialRelationship.positiveEvents);
  });
});
