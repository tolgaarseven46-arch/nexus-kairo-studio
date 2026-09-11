import { describe, expect, it } from "vitest";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

const ZERO = { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };
const BASE_AFFECT = { anger: 10, stress: 20, happiness: 70, calmness: 70 };

function initialPrev(): RelationshipReducerPrev {
  return {
    scores: {
      warmth: 65,
      trust: 70,
      conflict: 28,
      hurt: 34,
      repairProgress: 12,
      positiveEvents: 20,
      negativeEvents: 6,
      repeatedNegativeCount: 1,
      familiarity: 0.7,
    },
    conversationState: "distancing",
    reactionMode: "hurt",
    affect: BASE_AFFECT,
    firstSeenAt: "2025-10-01T00:00:00.000Z",
    lastInteractionAt: "2026-01-01T00:00:00.000Z",
    lastConflictAt: "2026-01-01T00:00:00.000Z",
    interactionCount: 80,
    boundarySetByKaira: true,
  };
}

const calm: RelationshipTurnSignal = {
  valence: "neutral",
  targetsKaira: false,
  severity: ZERO,
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.05,
  negativePattern: null,
};

function negativeSignal(uncertainty: number): RelationshipTurnSignal {
  return {
    valence: "negative",
    targetsKaira: true,
    severity: { ...ZERO, disrespect: 0.62, aggression: 0.18 },
    jokingConfidence: 0,
    sincerityConfidence: 0.92,
    apology: false,
    repairAttempt: false,
    repairStrength: 0,
    support: 0,
    compliment: 0,
    affection: 0,
    userStop: false,
    uncertainty,
    negativePattern: "phase2-uncertain-negative",
  };
}

function reduce(prev: RelationshipReducerPrev, signal: RelationshipTurnSignal, elapsedMinutes: number) {
  return reduceRelationshipTurn({
    prev,
    signal,
    timing: { elapsedMinutesSincePrev: elapsedMinutes, nowIso: "2026-01-02T00:00:00.000Z" },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });
}

describe("Core adversarial validation phase 2", () => {
  it("uses wall-clock elapsed time monotonically for calm recovery without resetting injury", () => {
    const prev = initialPrev();
    const immediate = reduce(prev, calm, 0);
    const fiveMinutes = reduce(prev, calm, 5);
    const oneHour = reduce(prev, calm, 60);
    const oneDay = reduce(prev, calm, 1440);

    expect(immediate.recovery.strength).toBeLessThanOrEqual(fiveMinutes.recovery.strength);
    expect(fiveMinutes.recovery.strength).toBeLessThanOrEqual(oneHour.recovery.strength);
    expect(oneHour.recovery.strength).toBeLessThanOrEqual(oneDay.recovery.strength);

    for (const result of [immediate, fiveMinutes, oneHour, oneDay]) {
      expect(result.scores.hurt).toBeGreaterThan(0);
      expect(result.scores.conflict).toBeGreaterThan(0);
      expect(result.hard.disengage).toBe(false);
    }

    expect(oneDay.scores.hurt).toBeLessThanOrEqual(immediate.scores.hurt);
    expect(oneDay.scores.conflict).toBeLessThanOrEqual(immediate.scores.conflict);
  });

  it("damps relationship mutation when the same negative semantic signal is highly uncertain", () => {
    const prev = initialPrev();
    const lowUncertainty = reduce(prev, negativeSignal(0.05), 5);
    const highUncertainty = reduce(prev, negativeSignal(0.9), 5);

    const lowInjury =
      (lowUncertainty.scores.hurt - Number(prev.scores.hurt)) +
      (lowUncertainty.scores.conflict - Number(prev.scores.conflict));
    const highInjury =
      (highUncertainty.scores.hurt - Number(prev.scores.hurt)) +
      (highUncertainty.scores.conflict - Number(prev.scores.conflict));
    const lowTrustLoss = Number(prev.scores.trust) - lowUncertainty.scores.trust;
    const highTrustLoss = Number(prev.scores.trust) - highUncertainty.scores.trust;

    expect(highInjury).toBeLessThan(lowInjury);
    expect(highTrustLoss).toBeLessThan(lowTrustLoss);
  });
});
