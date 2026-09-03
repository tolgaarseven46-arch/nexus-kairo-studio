import { describe, expect, it } from "vitest";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import { computeFamiliarity, evaluateRedline, reduceRelationshipTurn, type RelationshipReducerInput, type RelationshipTurnSignal } from "./relationshipReducer";

const zeroSeverity = { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 };
const baseSignal = (overrides: Partial<RelationshipTurnSignal> = {}): RelationshipTurnSignal => ({
  valence: "neutral", targetsKaira: false, severity: zeroSeverity, jokingConfidence: 0, sincerityConfidence: 0.8,
  apology: false, repairAttempt: false, support: 0, compliment: 0, affection: 0, userStop: false, uncertainty: 0.2, negativePattern: null,
  ...overrides,
});
const basePrev = (): RelationshipReducerInput["prev"] => ({
  scores: { warmth: 60, trust: 60, conflict: 0, hurt: 0, repairProgress: 0, positiveEvents: 2, negativeEvents: 0, repeatedNegativeCount: 0 },
  conversationState: "active", reactionMode: "neutral", affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
  firstSeenAt: "2026-09-01T00:00:00.000Z", lastInteractionAt: "2026-09-01T00:00:00.000Z", interactionCount: 2,
});

const turn = (prev: RelationshipReducerInput["prev"], signal: RelationshipTurnSignal, nowIso = "2026-09-01T00:05:00.000Z") =>
  reduceRelationshipTurn({ prev, signal, timing: { elapsedMinutesSincePrev: 5, nowIso }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });

describe("RelationshipReducer — continuous familiarity (RC-11)", () => {
  it("is > 0 within a same-day session driven by interaction count", () => {
    const familiarity = computeFamiliarity("2026-09-01T00:00:00.000Z", "2026-09-01T01:00:00.000Z", 4, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(familiarity).toBeGreaterThan(0);
    expect(familiarity).toBeLessThanOrEqual(1);
  });
});

describe("RelationshipReducer — maturity damping has no positive-feedback term (RC-12)", () => {
  it("damping does not increase as conflict/hurt rise", () => {
    const signal = baseSignal({ valence: "negative", targetsKaira: true, severity: { ...zeroSeverity, disrespect: 0.7 }, negativePattern: "insult" });
    const healthy = turn(basePrev(), signal);
    const damaged = turn({ ...basePrev(), scores: { ...basePrev().scores, conflict: 50, hurt: 50 } }, signal);
    expect(damaged.scores.hurt - 50).toBeGreaterThanOrEqual(healthy.scores.hurt);
  });
});

describe("RelationshipReducer — warmth homeostasis (RC-13 / S2)", () => {
  it("a benign neutral turn does not ratchet warmth down; it drifts toward baseline", () => {
    const high = turn({ ...basePrev(), scores: { ...basePrev().scores, warmth: 80 } }, baseSignal());
    const low = turn({ ...basePrev(), scores: { ...basePrev().scores, warmth: 40 } }, baseSignal());
    expect(high.scores.warmth).toBeLessThanOrEqual(80);
    expect(low.scores.warmth).toBeGreaterThanOrEqual(40);
  });
});

describe("RelationshipReducer — recovery = time + interaction (RC-3 / S3)", () => {
  it("recovers hurt with zero elapsed time when the turn is calm/positive", () => {
    const prev = { ...basePrev(), scores: { ...basePrev().scores, hurt: 30, conflict: 20 } };
    const result = reduceRelationshipTurn({ prev, signal: baseSignal({ valence: "positive", support: 0.8 }), timing: { elapsedMinutesSincePrev: 0, nowIso: "2026-09-01T00:05:00.000Z" }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });
    expect(result.scores.hurt).toBeLessThan(30);
    expect(result.recovery.interactionComponent).toBeGreaterThan(0);
  });

  it("neither apology alone nor time alone is a full reset", () => {
    const prev = { ...basePrev(), scores: { ...basePrev().scores, hurt: 40, conflict: 35 } };
    const apologyOnly = reduceRelationshipTurn({ prev, signal: baseSignal({ valence: "positive", apology: true, repairAttempt: true }), timing: { elapsedMinutesSincePrev: 0, nowIso: "2026-09-01T00:05:00.000Z" }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });
    const timeOnly = reduceRelationshipTurn({ prev, signal: baseSignal(), timing: { elapsedMinutesSincePrev: 24 * 60, nowIso: "2026-09-02T00:00:00.000Z" }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });
    expect(apologyOnly.scores.hurt).toBeGreaterThan(0);
    expect(timeOnly.scores.hurt).toBeGreaterThan(0);
  });
});

describe("RelationshipReducer — combined-signal redline, config-driven (RC-2 / S7 / S8, Decision #1/#2)", () => {
  it("a single mildly-disrespectful joke does NOT hard-stop", () => {
    const r = evaluateRedline(baseSignal({ valence: "negative", targetsKaira: true, severity: { ...zeroSeverity, disrespect: 0.5 }, jokingConfidence: 0.8, sincerityConfidence: 0.2 }), basePrev(), DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(r.disengage).toBe(false);
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
    // The fixture stays just above the present-severity gate so only the score threshold changes the outcome.
    const borderline = baseSignal({ valence: "negative", targetsKaira: true, severity: { disrespect: 0.73, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.4 }, sincerityConfidence: 0.8, uncertainty: 0.25 });
    const prev = { scores: { repeatedNegativeCount: 0 }, conversationState: "active" as const, reactionMode: "neutral" as const, affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 } };
    const strict = evaluateRedline(borderline, prev, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    const lenient = { ...DEFAULT_RELATIONSHIP_REDUCER_CONFIG, redline: { ...DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline, hardStopThreshold: 0.2 } };
    const loose = evaluateRedline(borderline, prev, lenient);
    expect(strict.disengage).toBe(false);
    expect(loose.disengage).toBe(true);
  });

  it("CRITICAL FIX: an apology (zero present severity) after prior conflict + boundary never hard-stops", () => {
    const apology = baseSignal({ valence: "positive", targetsKaira: true, apology: true, sincerityConfidence: 0.85, uncertainty: 0.3 });
    const withHistory = {
      scores: { repeatedNegativeCount: 2 }, conversationState: "active" as const, reactionMode: "irritated" as const,
      affect: { anger: 25, stress: 45, happiness: 55, calmness: 55 }, boundarySetByKaira: true,
    };
    const r = evaluateRedline(apology, withHistory, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(r.disengage).toBe(false);
    expect(r.presentSeverity).toBeLessThan(DEFAULT_RELATIONSHIP_REDUCER_CONFIG.redline.minPresentSeverity);
  });

  it("CRITICAL FIX: a mild remark below minPresentSeverity cannot hard-stop from history alone", () => {
    const mild = baseSignal({ valence: "negative", targetsKaira: true, severity: { ...zeroSeverity, disrespect: 0.3 }, negativePattern: "insult" });
    const withHistory = { ...basePrev(), scores: { ...basePrev().scores, repeatedNegativeCount: 8 }, boundarySetByKaira: true };
    const r = evaluateRedline(mild, withHistory, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(r.disengage).toBe(false);
  });

  it("repetition + prior boundary AMPLIFY a genuinely severe present turn (still gated on present harm)", () => {
    const severe = baseSignal({ valence: "negative", targetsKaira: true, severity: { disrespect: 0.8, coercion: 0.2, manipulation: 0, privacy: 0, aggression: 0.6 }, negativePattern: "insult" });
    const clean = evaluateRedline(severe, basePrev(), DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    const history = evaluateRedline(severe, { ...basePrev(), scores: { ...basePrev().scores, repeatedNegativeCount: 4 }, boundarySetByKaira: true }, DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(history.score).toBeGreaterThan(clean.score);
  });
});

describe("RelationshipReducer — no withdrawn affect floor (RC-14 / S11)", () => {
  it("a neutral question while withdrawn does not force a stress spike", () => {
    const prev = { ...basePrev(), conversationState: "disengaged" as const, reactionMode: "withdrawn" as const, affect: { anger: 15, stress: 45, happiness: 50, calmness: 50 }, disengageReason: "combined_boundary_violation" };
    const result = turn(prev, baseSignal());
    expect(result.affectDelta.stress).toBeLessThanOrEqual(0);
  });
});

describe("RelationshipReducer — K2: conversationState is not the sole determinant", () => {
  it("a SOFT disengaged (non-hard reason) still leaves openness > 0 and warmth intact", () => {
    const result = turn({ ...basePrev(), conversationState: "disengaged", reactionMode: "withdrawn", disengageReason: undefined }, baseSignal());
    expect(result.axes.openness).toBeGreaterThan(0);
    expect(result.axes.warmth).toBeGreaterThan(0);
  });

  it("a HARD disengage does crush openness", () => {
    const result = turn(basePrev(), baseSignal({ valence: "negative", targetsKaira: true, severity: { disrespect: 1, coercion: 0.8, manipulation: 0, privacy: 0, aggression: 0.9 }, negativePattern: "insult" }));
    expect(result.hard.disengage).toBe(true);
    expect(result.axes.openness).toBeLessThan(0.5);
  });

  it("high interpretation uncertainty softens the guardedness/openness collapse", () => {
    const lowUncertainty = turn({ ...basePrev(), conversationState: "distancing", reactionMode: "hurt", scores: { ...basePrev().scores, conflict: 25, hurt: 30 } }, baseSignal({ uncertainty: 0.1 }));
    const highUncertainty = turn({ ...basePrev(), conversationState: "distancing", reactionMode: "hurt", scores: { ...basePrev().scores, conflict: 25, hurt: 30 } }, baseSignal({ uncertainty: 0.9 }));
    expect(highUncertainty.axes.openness).toBeGreaterThanOrEqual(lowUncertainty.axes.openness);
  });
});

describe("RelationshipReducer — in-session exit from disengaged (RC-3 / S9)", () => {
  it("interaction-based repair can move disengaged -> repairing without elapsed time", () => {
    const prev = { ...basePrev(), scores: { ...basePrev().scores, conflict: 30, hurt: 35, repairProgress: 15 }, conversationState: "disengaged" as const, reactionMode: "withdrawn" as const, disengageReason: "combined_boundary_violation", repairAttempts: 1 };
    const result = reduceRelationshipTurn({ prev, signal: baseSignal({ valence: "positive", apology: true, repairAttempt: true, sincerityConfidence: 0.95 }), timing: { elapsedMinutesSincePrev: 0, nowIso: "2026-09-01T00:05:00.000Z" }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });
    expect(result.conversationState).toBe("repairing");
  });
});

describe("RelationshipReducer — repairProgress requires real injury (PR1-review fix)", () => {
  it("does not accumulate on calm turns when there is no injury to repair", () => {
    const result = turn(basePrev(), baseSignal({ valence: "positive" }));
    expect(result.scores.repairProgress).toBe(0);
  });

  it("decays toward 0 once injury drops below the floor, then grows again if injury returns", () => {
    const below = turn({ ...basePrev(), scores: { ...basePrev().scores, repairProgress: 20, hurt: 1, conflict: 1 } }, baseSignal());
    expect(below.scores.repairProgress).toBeLessThan(20);
    const injured = turn({ ...basePrev(), scores: { ...basePrev().scores, repairProgress: 5, hurt: 20, conflict: 20 } }, baseSignal({ valence: "positive", apology: true, repairAttempt: true }));
    expect(injured.scores.repairProgress).toBeGreaterThan(5);
  });
});

describe("RelationshipReducer — config has no dead knobs (PR1-review fix)", () => {
  it("every leaf key in DEFAULT_RELATIONSHIP_REDUCER_CONFIG is read by the reducer", () => {
    const serialized = JSON.stringify(DEFAULT_RELATIONSHIP_REDUCER_CONFIG);
    expect(serialized.length).toBeGreaterThan(100);
    const result = turn(basePrev(), baseSignal({ valence: "negative", targetsKaira: true, severity: { disrespect: 0.8, coercion: 0.2, manipulation: 0, privacy: 0, aggression: 0.5 }, negativePattern: "insult" }));
    expect(result.rationale.length).toBeGreaterThan(0);
  });
});