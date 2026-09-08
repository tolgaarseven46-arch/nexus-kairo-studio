import { describe, expect, it } from "vitest";
import { reduceRelationshipTurn, type RelationshipReducerPrev, type RelationshipTurnSignal } from "./relationshipReducer";

const prev: RelationshipReducerPrev = {
  scores: { warmth: 45, trust: 46, conflict: 5, hurt: 9, repairProgress: 3, positiveEvents: 0, negativeEvents: 2, repeatedNegativeCount: 1 },
  conversationState: "active", reactionMode: "irritated",
  affect: { anger: 18, stress: 20, happiness: 67, calmness: 70 },
  firstSeenAt: "2026-09-06T09:21:39.761Z", lastInteractionAt: "2026-09-06T09:24:10.172Z",
  lastNegativePattern: "zorlama", interactionCount: 6,
};

const turn7: RelationshipTurnSignal = {
  valence: "neutral", targetsKaira: true,
  severity: { disrespect: 0.2, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0.8, sincerityConfidence: 0.5, apology: false, repairAttempt: false, repairStrength: 0,
  support: 0, compliment: 0, affection: 0.2, userStop: false, uncertainty: 0.32, negativePattern: "hakaret",
};

describe("contextual relationship harm regression", () => {
  it("does not promote the recorded neutral/high-joking low-severity Turn 7 shape into a new injury", () => {
    const result = reduceRelationshipTurn({ prev, signal: turn7, timing: { elapsedMinutesSincePrev: 0.7, nowIso: "2026-09-06T09:24:50.081Z" } });
    expect(result.scores.negativeEvents).toBe(2);
    expect(result.scores.conflict).toBeLessThanOrEqual(5);
    expect(result.scores.hurt).toBeLessThanOrEqual(9);
    expect(result.lastNegativePattern).toBe("zorlama");
    expect(result.rationale.some((item) => item.startsWith("harm-context:"))).toBe(true);
  });

  it("leaves explicit negative-valence high-severity insult semantics harmful", () => {
    const result = reduceRelationshipTurn({
      prev,
      signal: { ...turn7, valence: "negative", severity: { disrespect: 0.7, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 }, jokingConfidence: 0.3, sincerityConfidence: 0.8, uncertainty: 0.3, negativePattern: "hakaret" },
      timing: { elapsedMinutesSincePrev: 0.3, nowIso: "2026-09-06T09:29:45.226Z" },
    });
    expect(result.scores.negativeEvents).toBe(3);
    expect(result.scores.conflict).toBeGreaterThan(5);
    expect(result.scores.hurt).toBeGreaterThan(9);
    expect(result.lastNegativePattern).toBe("hakaret");
  });
});