import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import {
  isRelationshipNeutralQuestionOnlyStop,
  relationshipSeverityForInterpretation,
} from "./kairaQuestionOnlyStopRelationshipPolicy";

function interpretation(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  const base: SemanticInterpretation = {
    schemaVersion: "semantic-interpretation@2",
    raw: "soru sorma artık",
    normalized: "soru sorma artık",
    primaryIntent: "command",
    secondarySocialActs: [],
    target: "kaira",
    valence: "negative",
    severity: { disrespect: 0.35, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.1 },
    jokingConfidence: 0,
    sincerityConfidence: 0.9,
    affection: 0,
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
      knowledgeQuery: null,
      selfMemoryQuery: null,
      relationalAct: "none",
      relationalIntensity: 0,
      stopQuestions: true,
      stopTalking: false,
    },
    uncertainty: { overall: 0.1, intent: 0.1, target: 0.1, severity: 0.2 },
    evidence: [{ source: "llm", cues: ["stopQuestions"], confidence: 0.9 }],
  };
  return { ...base, ...overrides };
}

describe("question-only stop relationship policy regression", () => {
  it("removes provider severity from a pure question-only stop", () => {
    const value = interpretation();
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(true);
    expect(relationshipSeverityForInterpretation(value)).toEqual({
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    });
  });

  it("preserves harm when the same request carries an independent insult act", () => {
    const value = interpretation({
      raw: "salak, soru sorma artık",
      normalized: "salak soru sorma artık",
      primaryIntent: "insult",
      secondarySocialActs: ["insult"],
      severity: { disrespect: 0.8, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.35 },
    });
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
    expect(relationshipSeverityForInterpretation(value)).toEqual(value.severity);
  });

  it("does not neutralize a full conversation stop", () => {
    const value = interpretation({
      stopRequest: true,
      discourseFacets: { ...interpretation().discourseFacets, stopQuestions: false, stopTalking: true },
    });
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
  });
});
