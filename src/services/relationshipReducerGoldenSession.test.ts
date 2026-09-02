/**
 * Golden-session contract for the canonical RelationshipReducer (ADR-0006).
 *
 * Replays the 18-turn KNT session `knt_test_user_x_new` through the reducer and
 * asserts the CORRECTED trajectory bounds — i.e. the behaviors the forensic
 * review flagged as bugs must no longer occur:
 *
 *   S2  warmth must not ratchet down on benign turns
 *   S3  recovery must engage on an interaction basis (turns are ~15-25s apart)
 *   S6/S7  a single ambiguous teasing insult (T11 "kaşar") must not hard-stop
 *   S8  a real combined-signal slur (T14) may hard-stop, but as a derived,
 *       config-driven decision — and it must not be reachable from a lone keyword
 *   S9  disengaged must be exitable within the session via repair turns
 *   S11 a neutral question while withdrawn (T18) must not spike stress
 *
 * Bounds are ranges, not exact values (Decision #10: calibration comes later).
 */

import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/knt-sessions/knt_test_user_x_new.golden.json";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipReducerResult,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { EMPTY_SEVERITY_VECTOR } from "../types/semanticInterpretation";

type GoldenTurn = {
  n: number;
  at: string;
  msg: string;
  signal: Partial<RelationshipTurnSignal> & { severity?: Partial<RelationshipTurnSignal["severity"]>; socialActs?: string[]; target?: string };
};

function toSignal(raw: GoldenTurn["signal"]): RelationshipTurnSignal {
  return {
    valence: raw.valence ?? "neutral",
    targetsKaira: raw.targetsKaira ?? false,
    severity: { ...EMPTY_SEVERITY_VECTOR, ...(raw.severity ?? {}) },
    jokingConfidence: raw.jokingConfidence ?? 0,
    sincerityConfidence: raw.sincerityConfidence ?? 0.5,
    apology: raw.apology ?? false,
    repairAttempt: raw.repairAttempt ?? false,
    support: raw.support ?? 0,
    compliment: raw.compliment ?? 0,
    affection: raw.affection ?? 0,
    userStop: raw.userStop ?? false,
    uncertainty: raw.uncertainty ?? 0.3,
    negativePattern: raw.negativePattern ?? null,
  };
}

describe("RelationshipReducer golden session — knt_test_user_x_new", () => {
  const turns = golden.turns as GoldenTurn[];

  const results: RelationshipReducerResult[] = [];
  let prev: RelationshipReducerPrev = {
    scores: { warmth: 50, trust: 50, conflict: 0, hurt: 0, repairProgress: 0, positiveEvents: 0, negativeEvents: 0, repeatedNegativeCount: 0 },
    conversationState: "active",
    reactionMode: "neutral",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt: golden.firstSeenAt,
    interactionCount: 0,
  };
  let lastAt = golden.firstSeenAt;

  for (const turn of turns) {
    const elapsedMinutesSincePrev = Math.max(0, (new Date(turn.at).getTime() - new Date(lastAt).getTime()) / 60000);
    const r = reduceRelationshipTurn({
      prev,
      signal: toSignal(turn.signal),
      timing: { elapsedMinutesSincePrev, nowIso: turn.at },
    });
    results.push(r);
    prev = {
      scores: r.scores,
      conversationState: r.conversationState,
      reactionMode: r.reactionMode,
      affect: {
        anger: Math.max(0, Math.min(100, prev.affect.anger + r.affectDelta.anger)),
        stress: Math.max(0, Math.min(100, prev.affect.stress + r.affectDelta.stress)),
        happiness: Math.max(0, Math.min(100, prev.affect.happiness + r.affectDelta.happiness)),
        calmness: Math.max(0, Math.min(100, prev.affect.calmness + r.affectDelta.calmness)),
      },
      firstSeenAt: golden.firstSeenAt,
      interactionCount: r.interactionCount,
      lastConflictAt: r.lastConflictAt,
      lastNegativePattern: r.lastNegativePattern,
      disengagedAt: r.disengagedAt,
      disengageReason: r.disengageReason,
      repairAttempts: r.repairAttempts,
      boundarySetByKaira: r.boundarySetByKaira,
    };
    lastAt = turn.at;
  }

  const at = (n: number) => results[n - 1];

  it("S2: benign early turns (2,4,5) do not ratchet warmth down", () => {
    expect(at(2).scores.warmth).toBeGreaterThanOrEqual(48);
    expect(at(4).scores.warmth).toBeGreaterThanOrEqual(47);
    expect(at(5).scores.warmth).toBeGreaterThanOrEqual(47);
    // legacy transcript reached warmth 38 by turn 10 on benign content; canonical must not
    expect(at(10).scores.warmth).toBeGreaterThan(42);
  });

  it("S3: recovery engages on an interaction basis (not 'no-elapsed-time')", () => {
    const calmTurnsWithRecovery = [2, 3, 4, 5, 9, 13].filter((n) => at(n).recovery.interactionComponent > 0);
    expect(calmTurnsWithRecovery.length).toBeGreaterThanOrEqual(4);
  });

  it("S6/S7: turn 11 ('kaşar', teasing, no prior boundary) does NOT hard-stop", () => {
    expect(at(11).hard.disengage).toBe(false);
    expect(at(11).conversationState).not.toBe("disengaged");
  });

  it("S8: turn 14 hard-stop is a derived combined-signal decision", () => {
    const t14 = at(14);
    // it may legitimately disengage here (severity + target + repetition + prior boundary),
    // but the decision must be reasoned, not a lone keyword
    if (t14.hard.disengage) {
      expect(t14.hard.reason).toBe("combined_boundary_violation");
      const redlineLine = t14.rationale.find((r) => r.startsWith("redline:"))!;
      const contributors = Number(redlineLine.split("/")[1].replace("*", ""));
      expect(contributors).toBeGreaterThanOrEqual(2);
    }
  });

  it("S9: the session is not permanently absorbing — repair turns move it out of disengaged", () => {
    // simulate two sincere repair turns appended after turn 18
    let p = prev;
    for (let k = 0; k < 3; k += 1) {
      const r = reduceRelationshipTurn({
        prev: p,
        signal: toSignal({ valence: "positive", apology: true, sincerityConfidence: 0.9, support: 0.4, uncertainty: 0.2 }),
        timing: { elapsedMinutesSincePrev: 1, nowIso: "2026-09-02T11:0" + (6 + k) + ":00.000Z" },
      });
      p = {
        scores: r.scores,
        conversationState: r.conversationState,
        reactionMode: r.reactionMode,
        affect: p.affect,
        firstSeenAt: golden.firstSeenAt,
        interactionCount: r.interactionCount,
        repairAttempts: r.repairAttempts,
        boundarySetByKaira: r.boundarySetByKaira,
      };
    }
    expect(p.conversationState).not.toBe("disengaged");
  });

  it("S11: a neutral question at turn 18 does not spike stress", () => {
    expect(at(18).affectDelta.stress).toBeLessThanOrEqual(0);
  });

  it("K2: at every turn where the state is disengaged for a non-hard reason, openness stays > 0", () => {
    for (const r of results) {
      if (r.conversationState === "disengaged" && !r.hard.disengage) {
        expect(r.axes.openness).toBeGreaterThan(0);
      }
    }
  });

  it("familiarity grows continuously within the same-day session (RC-11)", () => {
    expect(at(1).scores.familiarity).toBeLessThan(at(18).scores.familiarity);
    expect(at(18).scores.familiarity).toBeGreaterThan(0.2);
  });
});
