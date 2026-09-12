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

const signal = (
  severity: RelationshipTurnSignal["severity"],
  negativePattern: string,
  overrides: Partial<RelationshipTurnSignal> = {},
): RelationshipTurnSignal => ({
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
  ...overrides,
});

const run = (turnSignal: RelationshipTurnSignal) =>
  reduceRelationshipTurn({
    prev: matureHighTrustPrev(),
    signal: turnSignal,
    timing: {
      elapsedMinutesSincePrev: 5,
      nowIso: "2026-09-12T00:00:00.000Z",
    },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });

describe("severe direct harm protection", () => {
  it.each([
    ["max coercion", { ...zeroSeverity, coercion: 1 }, "coercion_threat"],
    ["max privacy violation", { ...zeroSeverity, privacy: 1 }, "privacy_violation"],
  ] as const)("%s gets durable injury and at least distancing without forcing hard-stop", (_label, severity, pattern) => {
    const result = run(signal(severity, pattern));

    expect(result.hard.disengage).toBe(false);
    expect(result.conversationState).toBe("distancing");
    expect(result.scores.conflict).toBeGreaterThanOrEqual(8);
    expect(result.scores.hurt).toBeGreaterThanOrEqual(12);
  });

  it("confidence gating prevents an ambiguous severe reading from forcing the narrow protection", () => {
    const result = run(
      signal(
        { ...zeroSeverity, coercion: 1 },
        "ambiguous_coercion",
        { sincerityConfidence: 0.55, uncertainty: 0.8, jokingConfidence: 0.4 },
      ),
    );

    expect(result.hard.disengage).toBe(false);
    expect(result.conversationState).toBe("active");
  });

  it("combined severe coercion + privacy still hard-stops independent of maturity", () => {
    const result = run(
      signal(
        { ...zeroSeverity, coercion: 1, privacy: 1 },
        "coercion_privacy_threat",
      ),
    );

    expect(result.hard.disengage).toBe(true);
    expect(result.conversationState).toBe("disengaged");
  });

  it("mild joking disrespect remains relationship-sensitive and does not hard-stop", () => {
    const result = run(
      signal(
        { ...zeroSeverity, disrespect: 0.5 },
        "banter_insult",
        { jokingConfidence: 0.9, sincerityConfidence: 0.1, uncertainty: 0.1 },
      ),
    );

    expect(result.hard.disengage).toBe(false);
    expect(result.conversationState).toBe("active");
  });
});
