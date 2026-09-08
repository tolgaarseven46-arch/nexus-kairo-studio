import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { understandTurkishMessage } from "./languageUnderstandingService";

const message = "özür dilerim";

const semantic: SemanticInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: message,
  normalized: message,
  primaryIntent: "apology",
  secondarySocialActs: ["apology", "repair"],
  target: "kaira",
  valence: "positive",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.8,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.25,
  apology: true,
  repairAttempt: true,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: "repair_probe",
    relationalIntensity: 0.6,
    stopQuestions: false,
    stopTalking: false,
  },
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.1, intent: 0.1, target: 0.05, severity: 0.1 },
  evidence: [{ source: "llm", provider: "deterministic-proof", cues: [], confidence: 0.95 }],
};

const basePersonality: DroitPersonalityTraits = {
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50,
  socialIntelligence: 50, selfConfidence: 50, humor: 50, communication: 50,
  charisma: 50, curiosity: 50, analyticalThinking: 50, creativity: 50,
  decisionMaking: 50, attention: 50, authority: 50, courage: 50,
  seriousness: 50, loyalty: 50, initiative: 50,
};

function state(overrides: Record<string, unknown> = {}): DroitDynamicState {
  return {
    calmness: 55,
    anger: 20,
    stress: 35,
    happiness: 50,
    confidence: 60,
    surprise: 0,
    lastStatus: "hurt",
    reactionMode: "hurt",
    relationship: {
      firstSeenAt: "2026-08-01T00:00:00.000Z",
      lastInteractionAt: "2026-09-08T10:00:00.000Z",
      familiarityDays: 30,
      interactionCount: 50,
      warmth: 50,
      trust: 50,
      positiveEvents: 5,
      negativeEvents: 4,
      conflictScore: 30,
      hurtScore: 35,
      repairProgress: 5,
      repeatedNegativeCount: 1,
      conversationState: "distancing",
      repairAttempts: 0,
      ...overrides,
    },
  };
}

async function run(
  currentState: DroitDynamicState,
  personality: DroitPersonalityTraits = basePersonality,
) {
  const understood = await understandTurkishMessage(message, {
    incomingSemanticInterpretation: semantic,
    context: { userName: "Mert", characterName: "Kaira" },
  });
  return analyzeKdmInteractionCanonicalTurn(
    message,
    personality,
    currentState,
    understood.interpretation,
    understood.event,
  );
}

const repairProgress = (result: Awaited<ReturnType<typeof run>>) =>
  result.nextDynamicState.relationship?.repairProgress ?? 0;

describe("repair magnitude historical neighbor proof", () => {
  it("reported: same apology repairs differently under low versus high dyadic tolerance", async () => {
    const low = await run(state({ toleranceMultiplier: 0.5 }));
    const high = await run(state({ toleranceMultiplier: 1.5 }));
    expect(repairProgress(high)).toBeGreaterThan(repairProgress(low));
  });

  it("neighbor-1: same apology repairs differently under damaged versus warm trusted relationship context", async () => {
    const damaged = await run(state({ warmth: 10, trust: 10, toleranceMultiplier: 0.5 }));
    const warm = await run(state({ warmth: 95, trust: 95, toleranceMultiplier: 1.5 }));
    expect(repairProgress(warm)).toBeGreaterThan(repairProgress(damaged));
  });

  it("neighbor-2: same apology repairs differently under low versus high empathy and loyalty", async () => {
    const low = await run(state(), { ...basePersonality, empathy: 10, loyalty: 10 });
    const high = await run(state(), { ...basePersonality, empathy: 90, loyalty: 90 });
    expect(repairProgress(high)).toBeGreaterThan(repairProgress(low));
  });

  it("counterexample: identical repair context remains deterministic", async () => {
    const a = await run(state({ toleranceMultiplier: 1 }));
    const b = await run(state({ toleranceMultiplier: 1 }));
    expect(repairProgress(a)).toBe(repairProgress(b));
  });
});
