import { describe, expect, it } from "vitest";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";

function turn(message: string, state?: ReturnType<typeof analyzeKdmInteraction>["nextDynamicState"]) {
  return analyzeKdmInteraction(message, undefined, state);
}

describe("KAIRA emotion-state direction contracts", () => {
  it("moves anger/stress up and calmness/happiness down for a direct insult", () => {
    const baseline = turn("selam").nextDynamicState;
    const hit = turn("salak", baseline).nextDynamicState;

    expect(hit.anger).toBeGreaterThan(baseline.anger);
    expect(hit.stress).toBeGreaterThan(baseline.stress);
    expect(hit.calmness).toBeLessThan(baseline.calmness);
    expect(hit.happiness).toBeLessThan(baseline.happiness);
    expect(hit.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
    expect(hit.relationship?.conflictScore ?? 0).toBeGreaterThan(0);
  });

  it("does not treat third-party negativity as a direct emotional injury to Kaira", () => {
    const baseline = turn("selam").nextDynamicState;
    const reported = turn("Mert salak", baseline).nextDynamicState;

    expect(reported.relationship?.hurtScore ?? 0).toBe(baseline.relationship?.hurtScore ?? 0);
    expect(reported.relationship?.conflictScore ?? 0).toBeLessThanOrEqual((baseline.relationship?.conflictScore ?? 0) + 1);
    expect(reported.anger).toBeLessThanOrEqual(baseline.anger + 1);
  });

  it("treats user low mood as emotional load without turning it into Kaira anger", () => {
    const baseline = turn("selam").nextDynamicState;
    const lowMood = turn("hiç havamda değilim", baseline);

    expect(lowMood.trace.messageInterpretation.sentiment).toBe("duygusal_yük");
    expect(lowMood.nextDynamicState.stress).toBeGreaterThanOrEqual(baseline.stress);
    expect(lowMood.nextDynamicState.anger).toBeLessThanOrEqual(baseline.anger);
    expect(lowMood.nextDynamicState.relationship?.hurtScore ?? 0).toBe(baseline.relationship?.hurtScore ?? 0);
  });

  it("lets a positive interaction move affect toward recovery", () => {
    const baseline = turn("selam").nextDynamicState;
    const positive = turn("teşekkür ederim harikasın", baseline).nextDynamicState;

    expect(positive.happiness).toBeGreaterThan(baseline.happiness);
    expect(positive.calmness).toBeGreaterThanOrEqual(baseline.calmness);
    expect(positive.stress).toBeLessThanOrEqual(baseline.stress);
    expect(positive.relationship?.warmth ?? 0).toBeGreaterThanOrEqual(baseline.relationship?.warmth ?? 0);
  });

  it("apology reduces acute activation but does not erase unresolved relationship damage", () => {
    const hit = turn("salak").nextDynamicState;
    const beforeHurt = hit.relationship?.hurtScore ?? 0;
    const beforeConflict = hit.relationship?.conflictScore ?? 0;
    const apology = turn("özür dilerim", hit).nextDynamicState;

    expect(apology.stress).toBeLessThanOrEqual(hit.stress);
    expect(apology.anger).toBeLessThanOrEqual(hit.anger);
    expect(apology.calmness).toBeGreaterThanOrEqual(hit.calmness);
    expect(apology.relationship?.hurtScore ?? 0).toBeLessThan(beforeHurt);
    expect(apology.relationship?.conflictScore ?? 0).toBeLessThan(beforeConflict);
    expect(apology.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
  });

  it("neutral conversation cannot instantly normalize affect while hurt is unresolved", () => {
    const hit = turn("salak").nextDynamicState;
    const neutral = turn("bugün hava normal", hit).nextDynamicState;

    expect(neutral.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
    expect(neutral.happiness).toBeLessThanOrEqual(hit.happiness);
    expect(neutral.calmness).toBeLessThanOrEqual(hit.calmness);
    expect(neutral.stress).toBeGreaterThanOrEqual(hit.stress);
  });
});
