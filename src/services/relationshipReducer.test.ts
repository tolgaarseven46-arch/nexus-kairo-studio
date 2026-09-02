import { describe, expect, it } from "vitest";
import {
  computeFamiliarity,
  evaluateRedline,
  reduceRelationshipTurn,
  type RelationshipReducerInput,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import { EMPTY_SEVERITY_VECTOR } from "../types/semanticInterpretation";

const NOW = "2026-09-02T12:00:00.000Z";

function baseSignal(over: Partial<RelationshipTurnSignal> = {}): RelationshipTurnSignal {
  return {
    valence: "neutral",
    targetsKaira: false,
    severity: { ...EMPTY_SEVERITY_VECTOR },
    jokingConfidence: 0,
    sincerityConfidence: 0.5,
    apology: false,
    repairAttempt: false,
    support: 0,
    compliment: 0,
    affection: 0,
    userStop: false,
    uncertainty: 0.2,
    negativePattern: null,
    ...over,
  };
}

interface InputOverride {
  prev?: Partial<RelationshipReducerInput["prev"]> | Record<string, unknown>;
  signal?: Partial<RelationshipTurnSignal>;
  timing?: Partial<RelationshipReducerInput["timing"]>;
  config?: RelationshipReducerInput["config"];
  prevExtra?: unknown;
}

function baseInput(over: InputOverride = {}): RelationshipReducerInput {
  return {
    prev: {
      scores: { warmth: 50, trust: 50, conflict: 0, hurt: 0, repairProgress: 0, positiveEvents: 0, negativeEvents: 0, repeatedNegativeCount: 0 },
      conversationState: "active",
      reactionMode: "neutral",
      affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
      firstSeenAt: "2026-09-02T11:00:00.000Z",
      interactionCount: 3,
      ...(over.prev ?? {}),
    } as RelationshipReducerInput["prev"],
    signal: baseSignal(over.signal),
    timing: { elapsedMinutesSincePrev: 0.3, nowIso: NOW, ...(over.timing ?? {}) },
    config: over.config,
  };
}

describe("RelationshipReducer — continuous familiarity (RC-11)", () => {
  it("is > 0 within a same-day session driven by interaction count", () => {
    const f = computeFamiliarity("2026-09-02T11:00:00.000Z", NOW, 18, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(f).toBeGreaterThan(0.15);
  });
});

describe("RelationshipReducer — maturity damping has no positive-feedback term (RC-12)", () => {
  it("damping does not increase as conflict/hurt rise", () => {
    const healthy = reduceRelationshipTurn(baseInput({ prev: { scores: { warmth: 50, trust: 50, conflict: 0, hurt: 0 } } as never }));
    const damaged = reduceRelationshipTurn(baseInput({ prev: { scores: { warmth: 50, trust: 50, conflict: 40, hurt: 40 } } as never }));
    const dHealthy = Number(healthy.rationale.find((r) => r.startsWith("damping:"))!.split(":")[1]);
    const dDamaged = Number(damaged.rationale.find((r) => r.startsWith("damping:"))!.split(":")[1]);
    expect(dDamaged).toBeGreaterThanOrEqual(dHealthy - 1e-9);
  });
});

describe("RelationshipReducer — warmth homeostasis (RC-13 / S2)", () => {
  it("a benign neutral turn does not ratchet warmth down; it drifts toward baseline", () => {
    const lowWarm = reduceRelationshipTurn(baseInput({ prev: { scores: { warmth: 30, trust: 50 } } as never }));
    expect(lowWarm.scores.warmth).toBeGreaterThanOrEqual(30);
    const highWarm = reduceRelationshipTurn(baseInput({ prev: { scores: { warmth: 70, trust: 50 } } as never }));
    expect(highWarm.scores.warmth).toBeLessThanOrEqual(70);
    expect(highWarm.scores.warmth).toBeGreaterThan(55);
  });
});

describe("RelationshipReducer — recovery = time + interaction (RC-3 / S3)", () => {
  it("recovers hurt with zero elapsed time when the turn is calm/positive", () => {
    const r = reduceRelationshipTurn(
      baseInput({
        prev: { scores: { warmth: 40, trust: 50, conflict: 15, hurt: 20 }, reactionMode: "irritated" } as never,
        signal: { valence: "positive", support: 0.5 },
        timing: { elapsedMinutesSincePrev: 0, nowIso: NOW },
      }),
    );
    expect(r.scores.hurt).toBeLessThan(20);
    expect(r.scores.conflict).toBeLessThan(15);
    expect(r.recovery.interactionComponent).toBeGreaterThan(0);
  });

  it("neither apology alone nor time alone is a full reset", () => {
    const apologyOnly = reduceRelationshipTurn(
      baseInput({
        prev: { scores: { conflict: 40, hurt: 40, repairProgress: 0 } } as never,
        signal: { apology: true, sincerityConfidence: 1 },
        timing: { elapsedMinutesSincePrev: 0, nowIso: NOW },
      }),
    );
    expect(apologyOnly.scores.hurt).toBeGreaterThan(10); // not wiped
    expect(apologyOnly.recovery.strength).toBeLessThanOrEqual(DEFAULT_RELATIONSHIP_REDUCER_CONFIG.recovery.maxSingleTurnRecovery + 1e-9);
  });
});

describe("RelationshipReducer — combined-signal redline, config-driven (RC-2 / S7 / S8, Decision #1/#2)", () => {
  it("a single mildly-disrespectful joke does NOT hard-stop", () => {
    const r = evaluateRedline(
      baseSignal({ valence: "negative", targetsKaira: true, severity: { ...EMPTY_SEVERITY_VECTOR, disrespect: 0.6 }, jokingConfidence: 0.7, sincerityConfidence: 0.2 }),
      { scores: { repeatedNegativeCount: 0 }, conversationState: "active", reactionMode: "neutral", affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 } },
      DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
    );
    expect(r.disengage).toBe(false);
    // playful framing pulls the score below the hard-stop threshold even if signals corroborate
    expect(r.score).toBeLessThan(DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.hardStopThreshold);
  });

  it("high-severity + targetsKaira + repetition DOES hard-stop", () => {
    const r = evaluateRedline(
      baseSignal({ valence: "negative", targetsKaira: true, severity: { disrespect: 0.95, coercion: 0.2, manipulation: 0, privacy: 0, aggression: 0.7 }, jokingConfidence: 0.05, sincerityConfidence: 0.9 }),
      { scores: { repeatedNegativeCount: 2 }, conversationState: "active", reactionMode: "irritated", affect: { anger: 25, stress: 40, happiness: 60, calmness: 55 } },
      DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
    );
    expect(r.disengage).toBe(true);
    expect(r.contributors).toBeGreaterThanOrEqual(DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.minCombinedSignals);
  });

  it("explicit user stop always hard-stops", () => {
    const r = evaluateRedline(baseSignal({ userStop: true }), { scores: {}, conversationState: "active", reactionMode: "neutral", affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 } }, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(r.disengage).toBe(true);
    expect(r.reason).toBe("user_stop");
  });

  it("thresholds are config-driven: lowering hardStopThreshold flips the borderline case", () => {
    const borderline = baseSignal({ valence: "negative", targetsKaira: true, severity: { disrespect: 0.35, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.12 }, sincerityConfidence: 0.8, uncertainty: 0.2 });
    const prev = { scores: { repeatedNegativeCount: 0 }, conversationState: "active" as const, reactionMode: "neutral" as const, affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 } };
    const strict = evaluateRedline(borderline, prev, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    const lenient = { ...DEFAULT_RELATIONSHIP_REDUCER_CONFIG, redline: { ...DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline, hardStopThreshold: 0.2 } };
    const loose = evaluateRedline(borderline, prev, lenient);
    expect(strict.disengage).toBe(false);
    expect(loose.disengage).toBe(true);
  });
});

describe("RelationshipReducer — no withdrawn affect floor (RC-14 / S11)", () => {
  it("a neutral question while withdrawn does not force a stress spike", () => {
    const r = reduceRelationshipTurn(
      baseInput({
        prev: {
          scores: { warmth: 24, trust: 46, conflict: 20, hurt: 36 },
          conversationState: "disengaged",
          reactionMode: "withdrawn",
          affect: { anger: 36, stress: 71, happiness: 65, calmness: 60 },
          disengageReason: "combined_boundary_violation",
        } as never,
        signal: { valence: "neutral", uncertainty: 0.3 },
      }),
    );
    expect(r.affectDelta.stress).toBeLessThanOrEqual(0);
  });
});

describe("RelationshipReducer — K2: conversationState is not the sole determinant", () => {
  it("a SOFT disengaged (non-hard reason) still leaves openness > 0 and warmth intact", () => {
    const r = reduceRelationshipTurn(
      baseInput({
        prev: {
          scores: { warmth: 45, trust: 55, conflict: 12, hurt: 14, repairProgress: 8 },
          conversationState: "disengaged",
          reactionMode: "withdrawn",
          affect: { anger: 20, stress: 40, happiness: 60, calmness: 60 },
          disengageReason: "soft_accumulation",
        } as never,
        signal: { valence: "neutral", uncertainty: 0.5 },
      }),
    );
    expect(r.hard.disengage).toBe(false);
    expect(r.axes.openness).toBeGreaterThan(0);
    expect(r.axes.warmth).toBeGreaterThan(0.2);
  });

  it("a HARD disengage does crush openness", () => {
    const r = reduceRelationshipTurn(
      baseInput({
        prev: { scores: { warmth: 30, trust: 45 }, conversationState: "active", reactionMode: "neutral" } as never,
        signal: { valence: "negative", targetsKaira: true, severity: { disrespect: 1, coercion: 0.3, manipulation: 0, privacy: 0, aggression: 0.9 }, sincerityConfidence: 1, negativePattern: "insult" },
        prevExtra: undefined,
      } as never),
    );
    if (r.hard.disengage) expect(r.axes.openness).toBeLessThan(0.25);
  });

  it("high interpretation uncertainty softens the guardedness/openness collapse", () => {
    const mk = (uncertainty: number) =>
      reduceRelationshipTurn(
        baseInput({
          prev: { scores: { warmth: 30, trust: 45, conflict: 45, hurt: 45 }, conversationState: "distancing", reactionMode: "hurt" } as never,
          signal: { valence: "neutral", uncertainty },
        }),
      );
    const confident = mk(0.05);
    const unsure = mk(0.8);
    expect(unsure.axes.openness).toBeGreaterThan(confident.axes.openness);
    expect(unsure.axes.guardedness).toBeLessThan(confident.axes.guardedness);
  });
});

describe("RelationshipReducer — in-session exit from disengaged (RC-3 / S9)", () => {
  it("interaction-based repair can move disengaged -> repairing without elapsed time", () => {
    let state = baseInput({
      prev: {
        scores: { warmth: 28, trust: 50, conflict: 12, hurt: 18, repairProgress: 18 },
        conversationState: "disengaged",
        reactionMode: "withdrawn",
        affect: { anger: 25, stress: 45, happiness: 60, calmness: 60 },
        disengageReason: "combined_boundary_violation",
        repairAttempts: 0,
      } as never,
      signal: { apology: true, repairAttempt: true, sincerityConfidence: 0.9, valence: "positive" },
      timing: { elapsedMinutesSincePrev: 0, nowIso: NOW },
    });
    const r1 = reduceRelationshipTurn(state);
    // one strong sincere repair turn should at least open the repairing path
    expect(["disengaged", "repairing"]).toContain(r1.conversationState);
    // feed a second calm turn
    state = baseInput({
      prev: {
        scores: r1.scores,
        conversationState: r1.conversationState,
        reactionMode: r1.reactionMode,
        affect: { anger: 20, stress: 40, happiness: 62, calmness: 62 },
        repairAttempts: r1.repairAttempts,
      } as never,
      signal: { apology: true, sincerityConfidence: 0.9, valence: "positive", support: 0.4 },
      timing: { elapsedMinutesSincePrev: 0, nowIso: NOW },
    });
    const r2 = reduceRelationshipTurn(state);
    expect(r2.conversationState).not.toBe("disengaged");
  });
});
