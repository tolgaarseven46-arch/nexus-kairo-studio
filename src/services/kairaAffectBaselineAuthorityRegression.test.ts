import { describe, expect, it } from "vitest";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import {
  reduceRelationshipTurn,
  type RelationshipReducerInput,
  type RelationshipTurnSignal,
} from "./relationshipReducer";

const zeroSeverity = {
  disrespect: 0,
  coercion: 0,
  manipulation: 0,
  privacy: 0,
  aggression: 0,
};

const neutralSignal: RelationshipTurnSignal = {
  valence: "neutral",
  targetsKaira: false,
  severity: zeroSeverity,
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  apology: false,
  repairAttempt: false,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.1,
  negativePattern: null,
};

const prev = (affect: RelationshipReducerInput["prev"]["affect"]): RelationshipReducerInput["prev"] => ({
  scores: {
    warmth: 60,
    trust: 60,
    conflict: 0,
    hurt: 0,
    repairProgress: 0,
    positiveEvents: 2,
    negativeEvents: 0,
    repeatedNegativeCount: 0,
  },
  conversationState: "active",
  reactionMode: "neutral",
  affect,
  firstSeenAt: "2026-09-01T00:00:00.000Z",
  lastInteractionAt: "2026-09-01T00:00:00.000Z",
  interactionCount: 2,
});

const timing = {
  elapsedMinutesSincePrev: 5,
  nowIso: "2026-09-01T00:05:00.000Z",
};

describe("affect baseline authority regression", () => {
  it("keeps the shipped homeostasis behavior when no baseline is supplied", () => {
    const result = reduceRelationshipTurn({
      prev: prev({ anger: 30, stress: 40, happiness: 50, calmness: 50 }),
      signal: neutralSignal,
      timing,
      config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
    });

    expect(result.affectDelta.anger).toBeLessThan(0);
    expect(result.affectDelta.stress).toBeLessThan(0);
    expect(result.affectDelta.happiness).toBeGreaterThan(0);
    expect(result.affectDelta.calmness).toBeGreaterThan(0);
  });

  it("lets one typed baseline own homeostasis instead of a reducer-local constant", () => {
    const affect = { anger: 30, stress: 40, happiness: 50, calmness: 50 };
    const result = reduceRelationshipTurn({
      prev: prev(affect),
      signal: neutralSignal,
      timing,
      config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
      affectBaseline: affect,
    });

    expect(result.affectDelta).toEqual({
      anger: 0,
      stress: 0,
      happiness: 0,
      calmness: 0,
    });
  });
});
