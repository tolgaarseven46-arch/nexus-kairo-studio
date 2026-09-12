import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { resolvePlanLifecycle } from "./worldEventLifecycle";

const SCOPE = "commitment:equal-time-order";
const CREATED_AT = "2026-09-13T00:00:00.000Z";

function observation(input: {
  id: string;
  modality: "commitment" | "none";
  lifecycle: "unspecified" | "cancelled";
  createdAt?: string;
}): WorldEventObservation {
  return {
    id: input.id,
    createdAt: input.createdAt ?? CREATED_AT,
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
  it("fails closed identically for the same simultaneous evidence regardless of storage order", () => {
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

    expect(commitmentFirst.state).toBe("unknown");
    expect(cancellationFirst.state).toBe("unknown");
    expect(commitmentFirst.generationObservationId).toBe("commitment-generation");
    expect(cancellationFirst.generationObservationId).toBe("commitment-generation");
    expect(new Set(commitmentFirst.evidenceObservationIds)).toEqual(
      new Set(["commitment-generation", "commitment-cancelled"]),
    );
    expect(new Set(cancellationFirst.evidenceObservationIds)).toEqual(
      new Set(["commitment-generation", "commitment-cancelled"]),
    );
  });

  it("still applies a lifecycle outcome that is strictly newer than the plan generation", () => {
    const commitment = observation({
      id: "older-plan",
      modality: "commitment",
      lifecycle: "unspecified",
      createdAt: "2026-09-13T00:00:00.000Z",
    });
    const cancellation = observation({
      id: "newer-cancellation",
      modality: "none",
      lifecycle: "cancelled",
      createdAt: "2026-09-13T00:01:00.000Z",
    });

    const resolution = resolvePlanLifecycle([commitment, cancellation], SCOPE);

    expect(resolution.state).toBe("cancelled");
    expect(resolution.generationObservationId).toBe("older-plan");
  });

  it("keeps an older lifecycle outcome outside a strictly newer plan generation", () => {
    const cancellation = observation({
      id: "older-cancellation",
      modality: "none",
      lifecycle: "cancelled",
      createdAt: "2026-09-13T00:00:00.000Z",
    });
    const commitment = observation({
      id: "newer-plan",
      modality: "commitment",
      lifecycle: "unspecified",
      createdAt: "2026-09-13T00:01:00.000Z",
    });

    const resolution = resolvePlanLifecycle([cancellation, commitment], SCOPE);

    expect(resolution.state).toBe("planned");
    expect(resolution.generationObservationId).toBe("newer-plan");
  });
});
