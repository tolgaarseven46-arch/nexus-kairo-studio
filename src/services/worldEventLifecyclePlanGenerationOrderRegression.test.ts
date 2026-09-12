import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { resolvePlanLifecycle } from "./worldEventLifecycle";

const SCOPE = "commitment:plan-generation-order";

function plan(id: string, createdAt: string): WorldEventObservation {
  return {
    id,
    createdAt,
    event: {
      raw: id,
      proposition: {
        key: SCOPE,
        actorKey: "user:alice",
        targetKey: "kaira",
      },
      polarity: "positive",
      modality: { kind: "commitment", strength: 0.95 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  } as unknown as WorldEventObservation;
}

describe("world-event lifecycle plan-generation order stability", () => {
  it("fails closed identically when two plan generations have the same valid timestamp", () => {
    const planA = plan("simultaneous-plan-a", "2026-09-13T01:00:00.000Z");
    const planB = plan("simultaneous-plan-b", "2026-09-13T01:00:00.000Z");

    const aFirst = resolvePlanLifecycle([planA, planB], SCOPE);
    const bFirst = resolvePlanLifecycle([planB, planA], SCOPE);

    expect(aFirst.state).toBe("unknown");
    expect(bFirst.state).toBe("unknown");
    expect(new Set(aFirst.evidenceObservationIds)).toEqual(
      new Set(["simultaneous-plan-a", "simultaneous-plan-b"]),
    );
    expect(new Set(bFirst.evidenceObservationIds)).toEqual(
      new Set(["simultaneous-plan-a", "simultaneous-plan-b"]),
    );
  });

  it("fails closed identically when two plan generations both have invalid timestamps", () => {
    const planA = plan("invalid-plan-a", "not-a-time");
    const planB = plan("invalid-plan-b", "also-not-a-time");

    const aFirst = resolvePlanLifecycle([planA, planB], SCOPE);
    const bFirst = resolvePlanLifecycle([planB, planA], SCOPE);

    expect(aFirst.state).toBe("unknown");
    expect(bFirst.state).toBe("unknown");
    expect(new Set(aFirst.evidenceObservationIds)).toEqual(
      new Set(["invalid-plan-a", "invalid-plan-b"]),
    );
    expect(new Set(bFirst.evidenceObservationIds)).toEqual(
      new Set(["invalid-plan-a", "invalid-plan-b"]),
    );
  });

  it("still selects a strictly newer valid plan generation", () => {
    const older = plan("older-plan", "2026-09-13T01:00:00.000Z");
    const newer = plan("newer-plan", "2026-09-13T01:01:00.000Z");

    const resolution = resolvePlanLifecycle([older, newer], SCOPE);

    expect(resolution.state).toBe("planned");
    expect(resolution.generationObservationId).toBe("newer-plan");
    expect(resolution.planObservationId).toBe("newer-plan");
  });
});
