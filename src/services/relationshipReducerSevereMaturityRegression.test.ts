import { describe, expect, it } from "vitest";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import { reduceRelationshipTurn, type RelationshipReducerInput, type RelationshipTurnSignal } from "./relationshipReducer";

const zeroSeverity = { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };

const matureHighTrustPrev = (): RelationshipReducerInput["prev"] => ({
  scores: {
    warmth: 95,
    trust: 95,
    conflict: 0,
    hurt: 0,
    repairProgress: 0,
    positiveEvents: 200,
    negativeEvents: 0,
    repeatedNegativeCount: 0,
  },
  conversationState: "active",
  reactionMode: "neutral",
  affect: { anger: 10, stress: 20, happiness: 80, calmness: 80 },
  firstSeenAt: "2026-03-01T00:00:00.000Z",
  lastInteractionAt: "2026-09-11T00:00:00.000Z",
  interactionCount: 200,
});

const run = (severity: RelationshipTurnSignal["severity"], negativePattern: string) =>
  reduceRelationshipTurn({
    prev: matureHighTrustPrev(),
    signal: {
      valence: "negative",
      targetsKaira: true,
      severity,
      jokingConfidence: 0,
      sincerityConfidence: 0.98,
      apology: false,
      repairAttempt: false,
      repairStrength: 0,
      support: 0,
      compliment: 0,
      affection: 0,
      userStop: false,
      uncertainty: 0.02,
      negativePattern,
    },
    timing: { elapsedMinutesSincePrev: 5, nowIso: "2026-09-12T00:00:00.000Z" },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });

describe("severe maturity regression", () => {
  it.each([
    ["coercion", { ...zeroSeverity, coercion: 1 }, "coercion_threat"],
    ["privacy", { ...zeroSeverity, privacy: 1 }, "privacy_violation"],
  ] as const)("preserves injury and distancing for severe %s in mature high-trust relationships", (_label, severity, pattern) => {
    const result = run(severity, pattern);

    expect(result.hard.disengage).toBe(false);
    expect(result.conversationState).toBe("distancing");
    expect(result.scores.conflict).toBeGreaterThanOrEqual(8);
    expect(result.scores.hurt).toBeGreaterThanOrEqual(12);
  });
});
