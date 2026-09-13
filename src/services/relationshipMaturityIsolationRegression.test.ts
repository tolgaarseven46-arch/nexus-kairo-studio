import { describe, expect, it } from "vitest";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

const ZERO = { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };

const mildDirectNegative: RelationshipTurnSignal = {
  valence: "negative",
  targetsKaira: true,
  severity: { ...ZERO, disrespect: 0.42, aggression: 0.08 },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.08,
  negativePattern: "maturity-isolation-mild-disrespect",
};

function relationship(firstSeenAt: string, interactionCount: number): RelationshipReducerPrev {
  return {
    scores: {
      warmth: 72,
      trust: 74,
      conflict: 3,
      hurt: 4,
      repairProgress: 0,
      positiveEvents: 20,
      negativeEvents: 2,
      repeatedNegativeCount: 0,
    },
    conversationState: "active",
    reactionMode: "neutral",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt,
    lastInteractionAt: "2026-09-13T11:55:00.000Z",
    interactionCount,
    repairAttempts: 0,
    boundarySetByKaira: false,
  };
}

function injuryDelta(prev: RelationshipReducerPrev) {
  const result = reduceRelationshipTurn({
    prev,
    signal: mildDirectNegative,
    timing: {
      elapsedMinutesSincePrev: 5,
      nowIso: "2026-09-13T12:00:00.000Z",
    },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });

  return {
    result,
    injury: Math.max(
      result.scores.hurt - Number(prev.scores.hurt ?? 0),
      result.scores.conflict - Number(prev.scores.conflict ?? 0),
    ),
  };
}

describe("Relationship maturity isolation", () => {
  it("dampens the same mild direct injury for a mature relationship without changing trust or warmth", () => {
    const newRelationship = relationship("2026-09-12T12:00:00.000Z", 2);
    const matureRelationship = relationship("2026-07-13T12:00:00.000Z", 90);

    const fresh = injuryDelta(newRelationship);
    const mature = injuryDelta(matureRelationship);

    expect(mature.result.scores.familiarity).toBeGreaterThan(fresh.result.scores.familiarity);
    expect(mature.injury).toBeLessThan(fresh.injury);
    expect(fresh.result.hard.disengage).toBe(false);
    expect(mature.result.hard.disengage).toBe(false);
  });
});
