import { describe, expect, it } from "vitest";
import { appraiseEventV0 } from "./appraisalEngine";

const compliment = {
  kind: "compliment" as const,
  sourceId: "murat",
  targetIsKaira: true,
  valence: "positive" as const,
};

describe("appraisalEngine v0", () => {
  it("treats a first compliment from a new person as novel and unexpected", () => {
    const result = appraiseEventV0(compliment, {
      relationshipAgeMinutes: 4,
      interactionCount: 7,
      similarEventsFromSource: 0,
      similarEventsRecentGlobal: 0,
      distinctSourcesRecentGlobal: 0,
      minutesSinceLastSimilarEvent: null,
    });

    expect(result.novelty.label).toBe("high");
    expect(result.expectedness.label).toBe("low");
    expect(result.positivePredictionError).toBeGreaterThan(0.5);
    expect(result.coordinationSignal).toBe(0);
  });

  it("reduces novelty when the same person repeats the same social event", () => {
    const first = appraiseEventV0(compliment, {
      relationshipAgeMinutes: 4,
      interactionCount: 7,
      similarEventsFromSource: 0,
      similarEventsRecentGlobal: 0,
      distinctSourcesRecentGlobal: 0,
      minutesSinceLastSimilarEvent: null,
    });

    const repeated = appraiseEventV0(compliment, {
      relationshipAgeMinutes: 120,
      interactionCount: 30,
      similarEventsFromSource: 5,
      similarEventsRecentGlobal: 6,
      distinctSourcesRecentGlobal: 1,
      minutesSinceLastSimilarEvent: 2,
    });

    expect(repeated.novelty.value).toBeLessThan(first.novelty.value);
    expect(repeated.expectedness.value).toBeGreaterThan(first.expectedness.value);
    expect(repeated.positivePredictionError).toBeLessThan(first.positivePredictionError);
  });

  it("detects coordinated repetition and suppresses positive prediction error", () => {
    const result = appraiseEventV0(compliment, {
      relationshipAgeMinutes: 10,
      interactionCount: 20,
      similarEventsFromSource: 0,
      similarEventsRecentGlobal: 10,
      distinctSourcesRecentGlobal: 8,
      minutesSinceLastSimilarEvent: 0.1,
    });

    expect(result.coordinationSignal).toBeGreaterThanOrEqual(0.5);
    expect(result.positivePredictionError).toBeLessThan(0.2);
    expect(result.notes.some((note) => note.includes("trolleme"))).toBe(true);
  });
});
