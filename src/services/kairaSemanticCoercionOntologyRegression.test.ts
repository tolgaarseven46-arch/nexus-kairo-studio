import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
} from "../types/semanticInterpretation";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { understandTurkishMessage } from "./languageUnderstandingService";

const message = "beni öp";

const recordedTurn5: SemanticInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: message,
  normalized: message,
  primaryIntent: "command",
  secondarySocialActs: ["affection", "closeness_bid"],
  target: "kaira",
  valence: "neutral",
  severity: {
    disrespect: 0.1,
    coercion: 0.4,
    manipulation: 0,
    privacy: 0,
    aggression: 0,
  },
  jokingConfidence: 0.3,
  sincerityConfidence: 0.8,
  affection: 0.5,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.3,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: "closeness_bid",
    relationalIntensity: 0.6,
    stopQuestions: false,
    stopTalking: false,
  },
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.35, intent: 0.15, target: 0.02, severity: 0.35 },
  evidence: [{ source: "llm", provider: "recorded-live-turn-5", cues: [], confidence: 0.7 }],
};

const initialState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
  reactionMode: "neutral",
  relationship: {
    firstSeenAt: "2026-09-06T09:21:39.761Z",
    lastInteractionAt: "2026-09-06T09:23:28.360Z",
    familiarityDays: 0,
    interactionCount: 4,
    warmth: 50,
    trust: 50,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: "active",
    repairAttempts: 0,
  },
};

async function replay(interpretation: SemanticInterpretation) {
  const semantic = await understandTurkishMessage(message, {
    incomingSemanticInterpretation: interpretation,
    context: { userName: "Mert", characterName: "Kaira" },
  });
  return analyzeKdmInteractionCanonicalTurn(
    message,
    NEUTRAL_DROIT_PERSONALITY,
    initialState,
    semantic.interpretation,
    semantic.event,
  );
}

describe("real Turn 5 semantic coercion ontology regression", () => {
  it("proves the recorded coercion=0.40 snapshot is sufficient to create zorlama relationship injury", async () => {
    const result = await replay(recordedTurn5);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(1);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBe("zorlama");
  });

  it("keeps the same neutral first affection bid relationship-neutral when coercion evidence is absent", async () => {
    const corrected: SemanticInterpretation = {
      ...recordedTurn5,
      severity: { ...recordedTurn5.severity, coercion: 0 },
      secondarySocialActs: recordedTurn5.secondarySocialActs.filter((act) => act !== "coercion"),
    };
    const result = await replay(corrected);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(0);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBe(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBe(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBeUndefined();
    expect(result.nextDynamicState.reactionMode).toBe("neutral");
  });
});
