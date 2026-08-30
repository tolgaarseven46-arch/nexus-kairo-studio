import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  buildTemporalEventGraph,
  observationsAfter,
  observationsBefore,
  retrieveTemporalNeighbors,
} from "./worldEventTemporalGraph";

function observation(input: {
  id: string;
  sessionId?: string;
  createdAt: string;
  startAt: string;
  endAt?: string;
  referenceId?: string;
  direction?: "before" | "after";
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "user-1",
    sessionId: input.sessionId || "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    ...(input.referenceId
      ? { temporalReferenceObservationId: input.referenceId }
      : {}),
    event: {
      raw: `event-${input.id}`,
      eventType: "general",
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      proposition: {
        key: `${input.id}|general|?`,
        predicate: "general",
        actorKey: input.id,
      },
      polarity: "positive",
      temporal: {
        relation: "past",
        asksLatest: false,
        ...(input.referenceId && input.direction
          ? {
              dependency: {
                anchor: "previous_event" as const,
                direction: input.direction,
                offsetAmount: 1,
                offsetUnit: "day" as const,
                marker: input.direction === "after" ? "ertesi gün" : "bir gün önce",
              },
            }
          : {}),
        resolved: {
          startAt: input.startAt,
          endAt: input.endAt || input.startAt,
          precision: "day",
          anchorAt: input.createdAt,
          source: input.referenceId ? "referenced_event" : "explicit_date",
        },
      },
    },
  };
}

describe("Kaira temporal event graph contracts", () => {
  it("creates an auditable before edge from persisted provenance", () => {
    const first = observation({
      id: "a",
      createdAt: "2026-08-20T12:00:00.000Z",
      startAt: "2026-08-20T00:00:00.000Z",
      endAt: "2026-08-20T23:59:59.999Z",
    });
    const second = observation({
      id: "b",
      createdAt: "2026-08-21T12:00:00.000Z",
      startAt: "2026-08-21T00:00:00.000Z",
      endAt: "2026-08-21T23:59:59.999Z",
      referenceId: "a",
      direction: "after",
    });

    const graph = buildTemporalEventGraph([second, first]);
    expect(graph.issues).toEqual([]);
    expect(graph.edges).toEqual([
      {
        sourceObservationId: "a",
        targetObservationId: "b",
        relation: "before",
        sessionId: "session-1",
        provenance: "temporal_reference_observation",
      },
    ]);
    expect(observationsAfter(graph, "a")).toEqual(["b"]);
    expect(observationsBefore(graph, "b")).toEqual(["a"]);
  });

  it("retrieves graph neighbors only when an explicit anchor id is supplied", () => {
    const first = observation({
      id: "a",
      createdAt: "2026-08-20T12:00:00.000Z",
      startAt: "2026-08-20T00:00:00.000Z",
      endAt: "2026-08-20T23:59:59.999Z",
    });
    const second = observation({
      id: "b",
      createdAt: "2026-08-21T12:00:00.000Z",
      startAt: "2026-08-21T00:00:00.000Z",
      endAt: "2026-08-21T23:59:59.999Z",
      referenceId: "a",
      direction: "after",
    });
    const observations = [second, first];

    expect(retrieveTemporalNeighbors(observations, undefined, "after")).toEqual([]);
    expect(retrieveTemporalNeighbors(observations, "a", "after").map((item) => item.id))
      .toEqual(["b"]);
    expect(retrieveTemporalNeighbors(observations, "b", "before").map((item) => item.id))
      .toEqual(["a"]);
  });

  it("reverses the edge when the current event is before the referenced event", () => {
    const reference = observation({
      id: "a",
      createdAt: "2026-08-21T12:00:00.000Z",
      startAt: "2026-08-21T00:00:00.000Z",
      endAt: "2026-08-21T23:59:59.999Z",
    });
    const earlier = observation({
      id: "b",
      createdAt: "2026-08-22T12:00:00.000Z",
      startAt: "2026-08-20T00:00:00.000Z",
      endAt: "2026-08-20T23:59:59.999Z",
      referenceId: "a",
      direction: "before",
    });

    const graph = buildTemporalEventGraph([earlier, reference]);
    expect(graph.issues).toEqual([]);
    expect(observationsAfter(graph, "b")).toEqual(["a"]);
  });

  it("rejects cross-session and missing provenance references", () => {
    const crossSessionReference = observation({
      id: "a",
      sessionId: "session-a",
      createdAt: "2026-08-20T12:00:00.000Z",
      startAt: "2026-08-20T00:00:00.000Z",
    });
    const crossSessionChild = observation({
      id: "b",
      sessionId: "session-b",
      createdAt: "2026-08-21T12:00:00.000Z",
      startAt: "2026-08-21T00:00:00.000Z",
      referenceId: "a",
      direction: "after",
    });
    const missing = observation({
      id: "c",
      sessionId: "session-b",
      createdAt: "2026-08-22T12:00:00.000Z",
      startAt: "2026-08-22T00:00:00.000Z",
      referenceId: "not-loaded",
      direction: "after",
    });

    const graph = buildTemporalEventGraph([
      crossSessionChild,
      crossSessionReference,
      missing,
    ]);
    expect(graph.edges).toEqual([]);
    expect(graph.issues.map((issue) => issue.invariant)).toEqual(
      expect.arrayContaining([
        "temporal_graph.cross_session_reference",
        "temporal_graph.missing_reference",
      ]),
    );
    expect(retrieveTemporalNeighbors([
      crossSessionChild,
      crossSessionReference,
      missing,
    ], "a", "after")).toEqual([]);
  });

  it("rejects provenance whose resolved intervals contradict the relation", () => {
    const first = observation({
      id: "a",
      createdAt: "2026-08-20T12:00:00.000Z",
      startAt: "2026-08-22T00:00:00.000Z",
      endAt: "2026-08-22T23:59:59.999Z",
    });
    const claimedAfter = observation({
      id: "b",
      createdAt: "2026-08-21T12:00:00.000Z",
      startAt: "2026-08-21T00:00:00.000Z",
      endAt: "2026-08-21T23:59:59.999Z",
      referenceId: "a",
      direction: "after",
    });

    const graph = buildTemporalEventGraph([claimedAfter, first]);
    expect(graph.edges).toEqual([]);
    expect(graph.issues.map((issue) => issue.invariant)).toContain(
      "temporal_graph.interval_order",
    );
  });
});
