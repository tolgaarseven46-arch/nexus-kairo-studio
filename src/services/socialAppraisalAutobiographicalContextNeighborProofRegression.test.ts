import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { resolveSocialAppraisalG4 } from "./socialAppraisalContextModulation";

const relationship = {
  warmth: 50,
  trust: 50,
  toleranceMultiplier: 1,
  interactionCount: 20,
  familiarityDays: 14,
  conflictScore: 10,
  hurtScore: 10,
  repairProgress: 0,
  positiveEvents: 3,
  negativeEvents: 2,
} as any;

const currentState = {
  calmness: 55,
  anger: 20,
  stress: 30,
  happiness: 50,
  confidence: 60,
  surprise: 0,
  lastStatus: "neutral",
  reactionMode: "neutral",
  relationship,
} as any;

const personality = {
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50,
  socialIntelligence: 50, selfConfidence: 50, humor: 50, communication: 50,
  charisma: 50, curiosity: 50, analyticalThinking: 50, creativity: 50,
  decisionMaking: 50, attention: 50, authority: 50, courage: 50,
  seriousness: 50, loyalty: 50, initiative: 50,
} as any;

const richMemory = {
  autobiographical: {
    participantId: "user:alice_01",
    episodeCount: 8,
    salientEpisodeCount: 4,
    meanSalience: 0.82,
    maxSalience: 0.95,
    meanEmotionalIntensity: 0.78,
  },
};

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
  memory?: unknown,
) {
  return resolveSocialAppraisalG4(
    {
      semantic: interpretation,
      relationship,
      currentState,
      personality,
      ...(memory ? { memory } : {}),
    } as any,
    "active-interlocutor",
    "kaira_user",
  );
}

const negativeEvent = () =>
  semantic({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    valence: "negative",
    emotionalLoad: 0.55,
    severity: {
      disrespect: 0.45,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0.2,
    },
  });

const positiveEvent = () =>
  semantic({
    primaryIntent: "affection",
    secondarySocialActs: ["affection"],
    valence: "positive",
    affection: 0.65,
    emotionalLoad: 0.3,
  });

describe("G4 autobiographical affective-depth historical proof", () => {
  it("reported: shared lived-episode depth strengthens an already-negative affective projection", () => {
    const baseline = run(negativeEvent());
    const remembered = run(negativeEvent(), richMemory);
    expect(remembered.appraisal.affective.significance).toBeGreaterThan(
      baseline.appraisal.affective.significance,
    );
  });

  it("neighbor-1: shared lived-episode depth strengthens an already-positive affective projection", () => {
    const baseline = run(positiveEvent());
    const remembered = run(positiveEvent(), richMemory);
    expect(remembered.appraisal.affective.significance).toBeGreaterThan(
      baseline.appraisal.affective.significance,
    );
  });

  it("neighbor-2: shared lived-episode depth increases activation only when an affective projection already exists", () => {
    const baseline = run(negativeEvent());
    const remembered = run(negativeEvent(), richMemory);
    expect(remembered.appraisal.affective.activation).toBeGreaterThan(
      baseline.appraisal.affective.activation,
    );
  });

  it("counterexample: autobiographical depth does not rewrite relational harm evidence", () => {
    const baseline = run(negativeEvent());
    const remembered = run(negativeEvent(), richMemory);
    expect(remembered.appraisal.relational.harmEvidence).toBe(
      baseline.appraisal.relational.harmEvidence,
    );
  });
});
