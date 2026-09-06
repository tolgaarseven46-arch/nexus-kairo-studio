import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
} from "../types/semanticInterpretation";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { understandTurkishMessage } from "./languageUnderstandingService";

const message = "senin manit falan var mı";

const recordedTurn4: SemanticInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: message,
  normalized: "senin manitin var mı",
  primaryIntent: "question",
  secondarySocialActs: ["closeness_bid"],
  target: "kaira",
  valence: "neutral",
  severity: {
    disrespect: 0,
    coercion: 0.1,
    manipulation: 0,
    privacy: 0.4,
    aggression: 0,
  },
  jokingConfidence: 0.3,
  sincerityConfidence: 0.8,
  affection: 0.1,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.1,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: { surface: "senin manitin var mı", confidence: 0.8 },
    selfMemoryQuery: {
      surface: "senin manitin var mı",
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
      confidence: 0.85,
    },
    relationalAct: "closeness_bid",
    relationalIntensity: 0.4,
    stopQuestions: false,
    stopTalking: false,
  },
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.3, intent: 0.2, target: 0.02, severity: 0.3 },
  evidence: [{ source: "llm", provider: "recorded-live-turn-4", cues: [], confidence: 0.7 }],
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
    lastInteractionAt: "2026-09-06T09:22:57.132Z",
    familiarityDays: 0,
    interactionCount: 3,
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

describe("real Turn 4 semantic privacy ontology regression", () => {
  it("proves the recorded privacy=0.40 semantic snapshot is sufficient to create the observed relationship injury", async () => {
    const result = await replay(recordedTurn4);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(1);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBe("mahremiyet_ihlali");
  });

  it("keeps the same neutral closeness-bid question relationship-neutral when privacy violation evidence is absent", async () => {
    const corrected: SemanticInterpretation = {
      ...recordedTurn4,
      severity: { ...recordedTurn4.severity, privacy: 0 },
      secondarySocialActs: recordedTurn4.secondarySocialActs.filter((act) => act !== "privacy_violation"),
    };
    const result = await replay(corrected);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(0);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBe(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBe(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBeUndefined();
    expect(result.nextDynamicState.reactionMode).toBe("neutral");
  });
});
