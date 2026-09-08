import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  affectDeltaFromRuntimeAppraisal,
  relationshipSignalFromRuntimeAppraisal,
  resolveRuntimeSocialAppraisal,
} from "./socialAppraisalRuntimeProjection";

const relationship = {
  warmthScore: 50,
  trustScore: 50,
  toleranceMultiplier: 1,
  interactionCount: 4,
  familiarityDays: 2,
  conflictScore: 0,
  hurtScore: 0,
} as any;

const currentState = {
  calmness: 50,
  anger: 10,
  stress: 20,
  happiness: 50,
  confidence: 50,
  surprise: 0,
  lastStatus: "neutral",
  reactionMode: "neutral",
} as any;

const personality = {
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

function project(event: ReturnType<typeof semantic>, scope: "kaira_user" | "third_party" | "event") {
  const resolution = resolveRuntimeSocialAppraisal({
    semantic: event,
    relationshipScope: scope,
    relationship,
    currentState,
    personality,
  });
  return {
    resolution,
    signal: relationshipSignalFromRuntimeAppraisal(event, scope, "insult", resolution),
  };
}

describe("G4 runtime projection authority bug-class neighbor proof", () => {
  it("reported: a third-party insult cannot damage the Kaira-user relationship but can affect Kaira", () => {
    const event = semantic({
      primaryIntent: "insult",
      secondarySocialActs: ["insult"],
      valence: "negative",
      emotionalLoad: 0.45,
      severity: {
        disrespect: 0.75,
        coercion: 0,
        manipulation: 0,
        privacy: 0,
        aggression: 0.2,
      },
    });
    const { resolution, signal } = project(event, "third_party");
    const affect = affectDeltaFromRuntimeAppraisal(
      { stress: 0, happiness: 0, calmness: 0, anger: 0 },
      resolution.runtimeAppraisal,
      "irritated",
    );

    expect(signal.valence).toBe("neutral");
    expect(Math.max(...Object.values(signal.severity))).toBe(0);
    expect(resolution.runtimeAppraisal.relational.significance).toBe(0);
    expect(resolution.runtimeAppraisal.affective.significance).toBeGreaterThan(0);
    expect(affect.stress).toBeGreaterThan(0);
  });

  it("neighbor-1: a third-party apology cannot manufacture dyadic repair", () => {
    const event = semantic({
      primaryIntent: "apology",
      secondarySocialActs: ["apology", "repair"],
      valence: "positive",
      apology: true,
      repairAttempt: true,
      sincerityConfidence: 0.95,
      emotionalLoad: 0.3,
    });
    const { signal } = project(event, "third_party");

    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
    expect(signal.valence).toBe("neutral");
  });

  it("neighbor-2: an event-scoped affection signal cannot mutate the dyadic relationship", () => {
    const event = semantic({
      primaryIntent: "affection",
      secondarySocialActs: ["affection"],
      valence: "positive",
      affection: 0.85,
      emotionalLoad: 0.35,
    });
    const { signal } = project(event, "event");

    expect(signal.targetsKaira).toBe(false);
    expect(signal.affection).toBe(0);
    expect(signal.valence).toBe("neutral");
  });

  it("counterexample: a Kaira-user affection event remains a positive affiliation", () => {
    const event = semantic({
      primaryIntent: "affection",
      secondarySocialActs: ["affection"],
      valence: "positive",
      affection: 0.85,
      emotionalLoad: 0.35,
    });
    const { signal } = project(event, "kaira_user");

    expect(signal.targetsKaira).toBe(true);
    expect(signal.valence).toBe("positive");
    expect(signal.affection).toBeGreaterThan(0);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
  });
});
