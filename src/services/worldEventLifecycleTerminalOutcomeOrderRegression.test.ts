import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { resolvePlanLifecycle } from "./worldEventLifecycle";

const SCOPE = "commitment:terminal-outcome-order";

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

function outcome(
  id: string,
  createdAt: string,
  kind: "executed" | "cancelled",
): WorldEventObservation {
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
      modality: { kind: "assertion", strength: 0.95 },
      lifecycle: { kind, strength: 0.95 },
    },
  } as unknown as WorldEventObservation;
}

describe("world-event lifecycle terminal outcome order stability", () => {
  it("fails closed identically when conflicting terminal outcomes share the same valid timestamp", () => {
    const commitment = plan("plan", "2026-09-13T01:00:00.000Z");
    const executed = outcome("executed", "2026-09-13T01:01:00.000Z", "executed");
    const cancelled = outcome("cancelled", "2026-09-13T01:01:00.000Z", "cancelled");

    const executedFirst = resolvePlanLifecycle([commitment, executed, cancelled], SCOPE);
    const cancelledFirst = resolvePlanLifecycle([commitment, cancelled, executed], SCOPE);

    expect(executedFirst.state).toBe("unknown");
    expect(cancelledFirst.state).toBe("unknown");
    expect(new Set(executedFirst.evidenceObservationIds)).toEqual(
      new Set(["executed", "cancelled"]),
    );
    expect(new Set(cancelledFirst.evidenceObservationIds)).toEqual(
      new Set(["executed", "cancelled"]),
    );
  });

  it("still resolves a strictly newer terminal outcome", () => {
    const commitment = plan("plan", "2026-09-13T01:00:00.000Z");
    const executed = outcome("executed", "2026-09-13T01:01:00.000Z", "executed");
    const cancelled = outcome("cancelled", "2026-09-13T01:02:00.000Z", "cancelled");

    const resolution = resolvePlanLifecycle([commitment, executed, cancelled], SCOPE);

    expect(resolution.state).toBe("cancelled");
    expect(resolution.latestObservationId).toBe("cancelled");
  });
});
