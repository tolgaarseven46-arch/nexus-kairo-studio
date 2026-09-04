import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";

function questionOnlyStopInterpretation(
  overrides: Partial<SemanticInterpretation> = {},
): SemanticInterpretation {
  const base: SemanticInterpretation = {
    schemaVersion: "semantic-interpretation@2",
    raw: "soru sorma artık",
    normalized: "soru sorma artık",
    primaryIntent: "command",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0.3,
      manipulation: 0,
      privacy: 0,
      aggression: 0.1,
    },
    jokingConfidence: 0.2,
    sincerityConfidence: 0.85,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.2,
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
      relationalAct: "challenge",
      relationalIntensity: 0.4,
      stopQuestions: true,
      stopTalking: false,
    },
    uncertainty: {
      overall: 0.2,
      intent: 0.1,
      target: 0.8,
      severity: 0.25,
    },
    evidence: [{ source: "llm", cues: ["stopQuestions"], confidence: 0.8 }],
  };
  return { ...base, ...overrides };
}

function runCanonicalTurn(interpretation: SemanticInterpretation) {
  return analyzeKdmInteractionCanonicalTurn(
    interpretation.raw,
    null,
    null,
    interpretation,
    interpretSemanticEvent(interpretation.raw),
    null,
  );
}

describe("question-only stop canonical runtime relationship regression", () => {
  it("keeps a pure question-only stop relationship-neutral even when provider target is unknown", () => {
    const result = runCanonicalTurn(questionOnlyStopInterpretation());
    const relationship = result.nextDynamicState.relationship;

    expect(relationship?.hurtScore ?? 0).toBe(0);
    expect(relationship?.conflictScore ?? 0).toBe(0);
    expect(relationship?.negativeEvents ?? 0).toBe(0);
  });

  it("projects an insult plus question-only stop onto the interlocutor when provider target is unknown", () => {
    const interpretation = questionOnlyStopInterpretation({
      raw: "salak, soru sorma artık",
      normalized: "salak soru sorma artık",
      primaryIntent: "command",
      secondarySocialActs: [],
      target: "unknown",
      valence: "negative",
      severity: {
        disrespect: 0.3,
        coercion: 0.3,
        manipulation: 0,
        privacy: 0,
        aggression: 0.3,
      },
    });
    const result = runCanonicalTurn(interpretation);
    const relationship = result.nextDynamicState.relationship;

    expect(Math.max(
      relationship?.hurtScore ?? 0,
      relationship?.conflictScore ?? 0,
    )).toBeGreaterThan(0);
    expect(relationship?.negativeEvents ?? 0).toBeGreaterThan(0);
  });
});
