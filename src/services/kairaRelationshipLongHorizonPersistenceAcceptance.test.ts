import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
} from "./relationshipReducerConfig";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipTurnSignal,
} from "./relationshipReducer";

const ZERO_SEVERITY = {
  disrespect: 0,
  coercion: 0,
  aggression: 0,
  manipulation: 0,
  privacy: 0,
};

const positiveSignal: RelationshipTurnSignal = {
  valence: "positive",
  targetsKaira: true,
  severity: ZERO_SEVERITY,
  jokingConfidence: 0,
  sincerityConfidence: 1,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0.7,
  compliment: 0.7,
  affection: 0.4,
  userStop: false,
  uncertainty: 0,
  negativePattern: null,
};

function initialPrev(firstSeenAt: string): RelationshipReducerPrev {
  return {
    scores: {
      warmth: 50,
      trust: 50,
      conflict: 0,
      hurt: 0,
      repairProgress: 0,
      positiveEvents: 0,
      negativeEvents: 0,
      repeatedNegativeCount: 0,
    },
    conversationState: "active",
    reactionMode: "neutral",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt,
    lastInteractionAt: firstSeenAt,
    interactionCount: 0,
    repairAttempts: 0,
    boundarySetByKaira: false,
  };
}

function nextPrev(
  previous: RelationshipReducerPrev,
  result: ReturnType<typeof reduceRelationshipTurn>,
  nowIso: string,
): RelationshipReducerPrev {
  return {
    scores: { ...result.scores },
    conversationState: result.conversationState,
    reactionMode: result.reactionMode,
    affect: {
      anger: previous.affect.anger + result.affectDelta.anger,
      stress: previous.affect.stress + result.affectDelta.stress,
      happiness: previous.affect.happiness + result.affectDelta.happiness,
      calmness: previous.affect.calmness + result.affectDelta.calmness,
    },
    firstSeenAt: previous.firstSeenAt,
    lastInteractionAt: nowIso,
    lastConflictAt: result.lastConflictAt,
    lastNegativePattern: result.lastNegativePattern,
    disengagedAt: result.disengagedAt,
    disengageReason: result.disengageReason,
    repairAttempts: result.repairAttempts,
    interactionCount: result.interactionCount,
    boundarySetByKaira: result.boundarySetByKaira,
  };
}

function runPositiveHorizon(
  start: RelationshipReducerPrev,
  fromDay: number,
  throughDay: number,
) {
  let prev = start;
  let last = null as ReturnType<typeof reduceRelationshipTurn> | null;
  for (let day = fromDay; day <= throughDay; day += 1) {
    const nowIso = new Date(Date.UTC(2026, 0, 1 + day)).toISOString();
    last = reduceRelationshipTurn({
      prev,
      signal: positiveSignal,
      timing: { elapsedMinutesSincePrev: 24 * 60, nowIso },
      config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
    });
    prev = nextPrev(prev, last, nowIso);
  }
  return { prev, last: last! };
}

describe("Kaira long-horizon relationship progression and persistence acceptance", () => {
  it("keeps familiarity and relationship quality progressing across a persistence-style round trip", () => {
    const firstSeenAt = "2026-01-01T00:00:00.000Z";
    const firstHalf = runPositiveHorizon(initialPrev(firstSeenAt), 1, 20);

    const persistedSnapshot = JSON.parse(JSON.stringify(firstHalf.prev)) as RelationshipReducerPrev;
    const secondHalf = runPositiveHorizon(persistedSnapshot, 21, 40);

    expect(firstHalf.last.interactionCount).toBe(20);
    expect(secondHalf.last.interactionCount).toBe(40);
    expect(secondHalf.last.scores.familiarity).toBeGreaterThan(firstHalf.last.scores.familiarity);
    expect(secondHalf.last.scores.warmth).toBeGreaterThanOrEqual(firstHalf.last.scores.warmth);
    expect(secondHalf.last.scores.trust).toBeGreaterThanOrEqual(firstHalf.last.scores.trust);
    expect(secondHalf.prev.firstSeenAt).toBe(firstSeenAt);
    expect(secondHalf.prev.lastInteractionAt).toBe("2026-02-10T00:00:00.000Z");
  });

  it("keeps the production persistence seam scoped to persistent Kaira instances", () => {
    const server = readFileSync("server.ts", "utf8");
    expect(server).toContain("kairaPolicy.persistentRelationship ? loadKdmState(stateUserId)");
    expect(server).toContain("kairaPolicy.persistentRelationship ? saveKdmInteraction({");
    expect(server).toContain("dynamicState: kdm.nextDynamicState");
    expect(server).toContain("userId: stateUserId");
  });

  it("preserves the durable relationship fields needed to continue after hydration", () => {
    const persistence = readFileSync("src/services/kdmPersistenceService.ts", "utf8");
    for (const field of [
      "firstSeenAt",
      "lastInteractionAt",
      "interactionCount",
      "warmth",
      "trust",
      "positiveEvents",
      "negativeEvents",
      "conflictScore",
      "hurtScore",
      "repairProgress",
      "repeatedNegativeCount",
      "conversationState",
      "repairAttempts",
      "lastConflictAt",
      "lastNegativePattern",
      "disengagedAt",
      "disengageReason",
    ]) {
      expect(persistence).toContain(field);
    }
    expect(persistence).toContain("return normalizeDynamicState(snapshot.data().dynamicState)");
  });
});
