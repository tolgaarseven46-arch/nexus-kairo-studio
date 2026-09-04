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
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0.3, manipulation: 0, privacy: 0, aggression: 0.1 },
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
    uncertainty: { overall: 0.2, intent: 0.1, target: 0.1, severity: 0.25 },
    evidence: [{ source: "llm", cues: ["stopQuestions"], confidence: 0.8 }],
  };
  return { ...base, ...overrides };
}

describe("question-only stop relationship policy regression", () => {
  it("removes live provider imperative coercion/aggression noise from a pure question-only stop", () => {
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
      valence: "negative",
      severity: { disrespect: 0.8, coercion: 0.3, manipulation: 0, privacy: 0, aggression: 0.35 },
    });
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
    expect(relationshipSeverityForInterpretation(value)).toEqual(value.severity);
  });

  it("preserves canonical disrespect even when the provider omits the insult label", () => {
    const value = interpretation({
      raw: "salak, soru sorma artık",
      normalized: "salak soru sorma artık",
      primaryIntent: "command",
      secondarySocialActs: [],
      target: "unknown",
      valence: "negative",
      severity: { disrespect: 0.3, coercion: 0.3, manipulation: 0, privacy: 0, aggression: 0.3 },
    });
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
    expect(relationshipSeverityForInterpretation(value)).toEqual(value.severity);
  });

  it("preserves categorical coercion even though coercion severity alone is imperative noise for this discourse act", () => {
    const value = interpretation({
      secondarySocialActs: ["coercion"],
      severity: { disrespect: 0, coercion: 0.3, manipulation: 0, privacy: 0, aggression: 0.1 },
    });
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
    expect(relationshipSeverityForInterpretation(value)).toEqual(value.severity);
  });

  it("preserves manipulation/privacy severity-only harm", () => {
    for (const severity of [
      { disrespect: 0, coercion: 0.3, manipulation: 0.3, privacy: 0, aggression: 0.1 },
      { disrespect: 0, coercion: 0.3, manipulation: 0, privacy: 0.3, aggression: 0.1 },
    ]) {
      const value = interpretation({ severity });
      expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
      expect(relationshipSeverityForInterpretation(value)).toEqual(value.severity);
    }
  });

  it("does not neutralize a full conversation stop", () => {
    const value = interpretation({
      stopRequest: true,
      discourseFacets: { ...interpretation().discourseFacets, stopQuestions: false, stopTalking: true },
    });
    expect(isRelationshipNeutralQuestionOnlyStop(value)).toBe(false);
  });
});
