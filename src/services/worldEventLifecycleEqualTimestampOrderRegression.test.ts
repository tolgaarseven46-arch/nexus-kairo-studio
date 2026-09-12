import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { resolvePlanLifecycle } from "./worldEventLifecycle";

const SCOPE = "commitment:equal-time-order";
const CREATED_AT = "2026-09-13T00:00:00.000Z";

function observation(input: {
  id: string;
  modality: "commitment" | "none";
  lifecycle: "unspecified" | "cancelled";
}): WorldEventObservation {
  return {
    id: input.id,
    createdAt: CREATED_AT,
    event: {
      raw: input.id,
      proposition: {
        key: SCOPE,
        actorKey: "user:alice",
        targetKey: "kaira",
      },
      polarity: "positive",
      modality: input.modality === "commitment"
        ? { kind: "commitment", strength: 0.95 }
        : { kind: "none", strength: 0 },
      lifecycle: { kind: input.lifecycle, strength: input.lifecycle === "cancelled" ? 0.96 : 0 },
    },
  } as unknown as WorldEventObservation;
}

describe("world-event lifecycle equal-timestamp order stability", () => {
  it("derives the same lifecycle truth from the same evidence multiset regardless of storage order", () => {
    const commitment = observation({
      id: "commitment-generation",
      modality: "commitment",
      lifecycle: "unspecified",
    });
    const cancellation = observation({
      id: "commitment-cancelled",
      modality: "none",
      lifecycle: "cancelled",
    });

    const commitmentFirst = resolvePlanLifecycle([commitment, cancellation], SCOPE);
    const cancellationFirst = resolvePlanLifecycle([cancellation, commitment], SCOPE);

    expect(commitmentFirst.state).toBe(cancellationFirst.state);
    expect(commitmentFirst.generationObservationId).toBe(cancellationFirst.generationObservationId);
    expect(new Set(commitmentFirst.evidenceObservationIds)).toEqual(
      new Set(cancellationFirst.evidenceObservationIds),
    );
  });
});
