import { describe, expect, it } from "vitest";
import { reduceRelationshipTurn, type RelationshipReducerPrev, type RelationshipTurnSignal } from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

const ZERO = { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };

function prev(): RelationshipReducerPrev {
  return {
    scores: { warmth: 65, trust: 70, conflict: 28, hurt: 34, repairProgress: 12, positiveEvents: 20, negativeEvents: 6, repeatedNegativeCount: 1, familiarity: 0.7 },
    conversationState: "distancing",
    reactionMode: "hurt",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt: "2025-10-01T00:00:00.000Z",
    lastInteractionAt: "2026-01-01T00:00:00.000Z",
    interactionCount: 80,
    boundarySetByKaira: true,
  };
}

function signal(uncertainty: number): RelationshipTurnSignal {
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
    negativePattern: "uncertainty-regression",
  };
}

function run(uncertainty: number) {
  const input = prev();
  return { input, result: reduceRelationshipTurn({ prev: input, signal: signal(uncertainty), timing: { elapsedMinutesSincePrev: 5, nowIso: "2026-01-02T00:00:00.000Z" }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG }) };
}

describe("relationship uncertainty mutation regression", () => {
  it("keeps a high-confidence canonical signal stronger than an otherwise identical uncertain signal", () => {
    const low = run(0.05);
    const high = run(0.9);
    const lowDelta = (low.result.scores.hurt - Number(low.input.scores.hurt)) + (low.result.scores.conflict - Number(low.input.scores.conflict));
    const highDelta = (high.result.scores.hurt - Number(high.input.scores.hurt)) + (high.result.scores.conflict - Number(high.input.scores.conflict));

    expect(highDelta).toBeLessThan(lowDelta);
    expect(high.result.scores.trust).toBeGreaterThan(low.result.scores.trust);
  });

  it("preserves nonzero mutation for high uncertainty instead of turning ambiguity into a full reset", () => {
    const high = run(0.9);
    expect(high.result.scores.hurt).toBeGreaterThanOrEqual(Number(high.input.scores.hurt));
    expect(high.result.scores.conflict).toBeGreaterThanOrEqual(Number(high.input.scores.conflict));
    expect(high.result.hard.disengage).toBe(false);
  });
});
