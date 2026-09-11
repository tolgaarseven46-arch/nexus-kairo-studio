import { describe, expect, it } from "vitest";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import { reduceDiscourseState } from "./discourseStateReducer";
import type { DiscourseState } from "../types/discourseState";

const ZERO = { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };
const BASE_AFFECT = { anger: 10, stress: 20, happiness: 70, calmness: 70 };

const positive: RelationshipTurnSignal = {
  valence: "positive",
  targetsKaira: true,
  severity: ZERO,
  jokingConfidence: 0,
  sincerityConfidence: 0.95,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0.65,
  compliment: 0.45,
  affection: 0.3,
  userStop: false,
  uncertainty: 0.05,
  negativePattern: null,
};

const neutral: RelationshipTurnSignal = {
  ...positive,
  valence: "neutral",
  support: 0,
  compliment: 0,
  affection: 0,
};

const moderateNegative: RelationshipTurnSignal = {
  ...neutral,
  valence: "negative",
  severity: { ...ZERO, disrespect: 0.42, aggression: 0.08 },
  sincerityConfidence: 0.9,
  uncertainty: 0.08,
  negativePattern: "adversarial-moderate-disrespect",
};

const repair: RelationshipTurnSignal = {
  ...positive,
  apology: true,
  repairAttempt: true,
  repairStrength: 0.82,
  support: 0.5,
  compliment: 0,
  affection: 0.1,
};

function initialPrev(overrides: Partial<RelationshipReducerPrev> = {}): RelationshipReducerPrev {
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
      ...(overrides.scores ?? {}),
    },
    conversationState: overrides.conversationState ?? "active",
    reactionMode: overrides.reactionMode ?? "neutral",
    affect: overrides.affect ?? BASE_AFFECT,
    firstSeenAt: overrides.firstSeenAt,
    lastInteractionAt: overrides.lastInteractionAt,
    lastConflictAt: overrides.lastConflictAt,
    lastNegativePattern: overrides.lastNegativePattern,
    disengagedAt: overrides.disengagedAt,
    disengageReason: overrides.disengageReason,
    repairAttempts: overrides.repairAttempts ?? 0,
    interactionCount: overrides.interactionCount ?? 0,
    boundarySetByKaira: overrides.boundarySetByKaira ?? false,
  };
}

function nextPrev(prev: RelationshipReducerPrev, signal: RelationshipTurnSignal, turn: number, elapsedMinutes = 5) {
  const nowIso = new Date(Date.UTC(2026, 0, 1, 0, turn * 5)).toISOString();
  const result = reduceRelationshipTurn({
    prev,
    signal,
    timing: { elapsedMinutesSincePrev: elapsedMinutes, nowIso },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });
  const next: RelationshipReducerPrev = {
    scores: result.scores,
    conversationState: result.conversationState,
    reactionMode: result.reactionMode,
    affect: {
      anger: Math.max(0, Math.min(100, prev.affect.anger + result.affectDelta.anger)),
      stress: Math.max(0, Math.min(100, prev.affect.stress + result.affectDelta.stress)),
      happiness: Math.max(0, Math.min(100, prev.affect.happiness + result.affectDelta.happiness)),
      calmness: Math.max(0, Math.min(100, prev.affect.calmness + result.affectDelta.calmness)),
    },
    firstSeenAt: prev.firstSeenAt ?? nowIso,
    lastInteractionAt: nowIso,
    lastConflictAt: result.lastConflictAt,
    lastNegativePattern: result.lastNegativePattern,
    disengagedAt: result.disengagedAt,
    disengageReason: result.disengageReason,
    repairAttempts: result.repairAttempts,
    interactionCount: result.interactionCount,
    boundarySetByKaira: result.boundarySetByKaira,
  };
  return { result, next };
}

function expectBounded(prev: RelationshipReducerPrev) {
  for (const key of ["warmth", "trust", "conflict", "hurt", "repairProgress"] as const) {
    const value = Number(prev.scores[key]);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  }
  expect(Number(prev.scores.familiarity)).toBeGreaterThanOrEqual(0);
  expect(Number(prev.scores.familiarity)).toBeLessThanOrEqual(1);
}

describe("Core adversarial validation phase 1", () => {
  it("survives 120 positive turns without drift outside canonical bounds", () => {
    let prev = initialPrev();
    let priorFamiliarity = 0;
    for (let turn = 1; turn <= 120; turn += 1) {
      const step = nextPrev(prev, positive, turn);
      prev = step.next;
      expectBounded(prev);
      expect(step.result.scores.familiarity).toBeGreaterThanOrEqual(priorFamiliarity);
      priorFamiliarity = step.result.scores.familiarity;
      expect(step.result.hard.disengage).toBe(false);
    }
    expect(prev.interactionCount).toBe(120);
    expect(Number(prev.scores.familiarity)).toBeGreaterThan(0.8);
    expect(Number(prev.scores.hurt)).toBeLessThan(1);
    expect(Number(prev.scores.conflict)).toBeLessThan(1);
  });

  it("survives 120-turn injury then repair trajectory and materially recovers", () => {
    let prev = initialPrev({ scores: { warmth: 72, trust: 74 } });
    let peakInjury = 0;
    for (let turn = 1; turn <= 20; turn += 1) {
      const step = nextPrev(prev, moderateNegative, turn, 2);
      prev = step.next;
      peakInjury = Math.max(peakInjury, Number(prev.scores.hurt), Number(prev.scores.conflict));
      expectBounded(prev);
      expect(step.result.hard.disengage).toBe(false);
    }
    const injuryAfterNegativePhase = Math.max(Number(prev.scores.hurt), Number(prev.scores.conflict));
    for (let turn = 21; turn <= 120; turn += 1) {
      const step = nextPrev(prev, turn % 3 === 0 ? positive : repair, turn, 30);
      prev = step.next;
      expectBounded(prev);
    }
    const finalInjury = Math.max(Number(prev.scores.hurt), Number(prev.scores.conflict));
    expect(peakInjury).toBeGreaterThan(0);
    expect(finalInjury).toBeLessThan(injuryAfterNegativePhase);
    expect(prev.interactionCount).toBe(120);
    expect(prev.conversationState).not.toBe("disengaged");
  });

  it("remains finite and bounded across 150 alternating harm/repair/neutral turns", () => {
    let prev = initialPrev({ scores: { warmth: 55, trust: 48, hurt: 8, conflict: 6 } });
    for (let turn = 1; turn <= 150; turn += 1) {
      const signal = turn % 5 === 0 ? moderateNegative : turn % 3 === 0 ? repair : neutral;
      const step = nextPrev(prev, signal, turn, turn % 7 === 0 ? 180 : 7);
      prev = step.next;
      expectBounded(prev);
      for (const value of Object.values(step.result.affectDelta)) expect(Number.isFinite(value)).toBe(true);
    }
    expect(prev.interactionCount).toBe(150);
  });

  it("covers all 8 trust × warmth × familiarity extremes under the same insult", () => {
    const rows: Array<{ highTrust: boolean; highWarmth: boolean; mature: boolean; injuryDelta: number }> = [];
    for (const highTrust of [false, true]) {
      for (const highWarmth of [false, true]) {
        for (const mature of [false, true]) {
          const now = new Date(Date.UTC(2026, 0, 1)).toISOString();
          const firstSeenAt = mature ? new Date(Date.UTC(2025, 9, 1)).toISOString() : now;
          const baseHurt = 4;
          const baseConflict = 3;
          const prev = initialPrev({
            scores: {
              trust: highTrust ? 85 : 15,
              warmth: highWarmth ? 85 : 15,
              hurt: baseHurt,
              conflict: baseConflict,
            },
            firstSeenAt,
            lastInteractionAt: now,
            interactionCount: mature ? 90 : 1,
          });
          const result = reduceRelationshipTurn({
            prev,
            signal: moderateNegative,
            timing: { elapsedMinutesSincePrev: 5, nowIso: new Date(Date.UTC(2026, 0, 1, 0, 5)).toISOString() },
            config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
          });
          const injuryDelta = Math.max(result.scores.hurt - baseHurt, result.scores.conflict - baseConflict);
          rows.push({ highTrust, highWarmth, mature, injuryDelta });
          expect(Number.isFinite(injuryDelta)).toBe(true);
          expect(result.scores.familiarity).toBeGreaterThanOrEqual(0);
          expect(result.scores.familiarity).toBeLessThanOrEqual(1);
          expect(result.hard.disengage).toBe(false);
        }
      }
    }
    expect(rows).toHaveLength(8);
    const lowestQuality = rows.find((r) => !r.highTrust && !r.highWarmth && !r.mature)!;
    const highestQuality = rows.find((r) => r.highTrust && r.highWarmth && r.mature)!;
    expect(highestQuality.injuryDelta).toBeLessThan(lowestQuality.injuryDelta);
  });

  it("fails closed on a three-way discourse collision: two threads plus pending Kaira question", () => {
    const prev: DiscourseState = {
      turnIndex: 9,
      routines: {
        greeting: { count: 0, lastTurnIndex: -99 },
        howAreYou: { count: 0, lastTurnIndex: -99 },
        whatDoing: { count: 0, lastTurnIndex: -99 },
      },
      pendingQuestion: { asker: "kaira", kind: "how_are_you", askedAtTurn: 9, answered: false },
      kairaRecentActs: [{ act: "how_are_you", turnIndex: 9 }],
      selfRepeat: null,
      previousTurnDependency: null,
      openThreads: [
        { id: "third-party-a", kind: "third_party_topic", anchorText: "Mert işi bırakmayı düşünüyor", openedAtTurn: 2, lastRelevantTurn: 2 },
        { id: "third-party-b", kind: "third_party_topic", anchorText: "Ali müdürüyle tartıştı", openedAtTurn: 6, lastRelevantTurn: 6 },
      ],
      activeThreadId: null,
      resumedThreadId: null,
      ambiguousThreadResumption: false,
      lastUserAct: "statement",
      lastKairaAct: "how_are_you",
    };

    const event = {
      intent: "question",
      target: "unknown",
      valence: "neutral",
      frustration: 0,
      insult: false,
      emotionalLoad: 0,
      adviceRequested: true,
      socialRoutine: "none",
      discourseAct: "recall_request",
      repairSignal: "none",
      relationalAct: "none",
      relationalIntensity: 0,
      stopQuestions: false,
      stopTalking: false,
      shortUtteranceShape: true,
      stateAnswerShape: false,
      activityAnswerShape: false,
      signalsAlreadyAnswered: false,
      answerFriction: false,
      knowledgeQuery: null,
      worldMemory: { claims: [], query: null },
    } as any;

    const next = reduceDiscourseState(prev, {
      actor: "user",
      message: "peki sence ne yapmalı?",
      event,
    });

    expect(next.ambiguousThreadResumption).toBe(true);
    expect(next.resumedThreadId).toBeNull();
    expect(next.activeThreadId).toBeNull();
    expect(next.openThreads).toEqual(prev.openThreads);
    expect(next.pendingQuestion?.asker).toBe("user");
    expect(next.pendingQuestion?.answered).toBe(false);
  });
});
