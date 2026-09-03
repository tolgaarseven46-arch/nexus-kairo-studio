/**
 * repairProgress invariant (ADR-0006 foundation repair, task §5).
 *
 * repairProgress is progress toward repairing REAL injury. It must not accrue
 * on ordinary positive/neutral turns when there is nothing to repair, and an
 * apology alone is not a fresh injury.
 *
 * Verified on the canonical reducer (the path the foundation-repair PR turns on
 * for test/beta). The dying legacy `kdmConsistencyEngine` is NOT patched here.
 */

import { describe, expect, it } from "vitest";
import { reduceRelationshipTurn, type RelationshipReducerInput } from "./relationshipReducer";
import { EMPTY_SEVERITY_VECTOR } from "../types/semanticInterpretation";

const NOW = "2026-09-03T12:00:00.000Z";

const neutralSignal = () => ({
  valence: "neutral" as const,
  targetsKaira: false,
  severity: { ...EMPTY_SEVERITY_VECTOR },
  jokingConfidence: 0.1,
  sincerityConfidence: 0.6,
  apology: false,
  repairAttempt: false,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.3,
  negativePattern: null,
});

const base = (over: Partial<RelationshipReducerInput> = {}): RelationshipReducerInput => ({
  prev: {
    scores: {
      warmth: 55,
      trust: 55,
      conflict: 0,
      hurt: 0,
      repairProgress: 0,
      positiveEvents: 4,
      negativeEvents: 0,
      repeatedNegativeCount: 0,
      familiarity: 0.4,
    },
    conversationState: "active",
    reactionMode: "neutral",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt: "2026-08-20T00:00:00.000Z",
    lastInteractionAt: "2026-09-03T11:30:00.000Z",
    interactionCount: 20,
  },
  signal: neutralSignal(),
  timing: { elapsedMinutesSincePrev: 30, nowIso: NOW },
  ...over,
});

describe("repairProgress requires real injury", () => {
  it("no injury + positive turn -> repairProgress does NOT advance", () => {
    const r = reduceRelationshipTurn(
      base({
        signal: { ...neutralSignal(), valence: "positive", compliment: 0.6 },
      }),
    );
    expect(r.scores.conflict).toBe(0);
    expect(r.scores.hurt).toBe(0);
    expect(r.scores.repairProgress).toBeLessThanOrEqual(0);
  });

  it("no injury + calm neutral turn -> repairProgress stays at 0", () => {
    const r = reduceRelationshipTurn(base());
    expect(r.scores.repairProgress).toBeLessThanOrEqual(0);
  });

  it("no injury + apology -> apology is NOT counted as a fresh injury and repair does not spike", () => {
    const r = reduceRelationshipTurn(
      base({ signal: { ...neutralSignal(), valence: "positive", apology: true } }),
    );
    expect(r.scores.conflict).toBe(0);
    expect(r.scores.hurt).toBe(0);
    expect(r.scores.negativeEvents).toBe(0);
    expect(r.scores.repairProgress).toBeLessThanOrEqual(0);
  });

  it("REAL injury present + apology -> repairProgress CAN advance", () => {
    const injured = base({
      prev: {
        ...base().prev,
        scores: { ...base().prev.scores, conflict: 24, hurt: 22, repairProgress: 0 },
        conversationState: "distancing",
      },
      signal: { ...neutralSignal(), valence: "positive", apology: true, sincerityConfidence: 0.85 },
    });
    const r = reduceRelationshipTurn(injured);
    expect(r.scores.repairProgress).toBeGreaterThan(0);
  });

  it("REAL injury present + calm non-repair turn -> repairProgress does not jump the way an apology would", () => {
    const injured = base({
      prev: {
        ...base().prev,
        scores: { ...base().prev.scores, conflict: 20, hurt: 20, repairProgress: 5 },
        conversationState: "distancing",
      },
    });
    const r = reduceRelationshipTurn(injured);
    // may inch up from calmness, but far below an apology's gain
    expect(r.scores.repairProgress).toBeLessThan(15);
  });
});
