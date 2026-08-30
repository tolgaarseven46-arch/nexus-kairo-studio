import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  coordinateWorldEventRetrieval,
  shouldCoordinateWorldEventRetrieval,
} from "./worldEventRetrievalCoordinator";

function observation(input: {
  id: string;
  createdAt: string;
  sessionId?: string;
  referenceId?: string;
  direction?: "before" | "after";
  raw?: string;
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "user-1",
    sessionId: input.sessionId || "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    ...(input.referenceId ? { temporalReferenceObservationId: input.referenceId } : {}),
    event: {
      raw: input.raw || `event-${input.id}`,
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
          startAt: input.createdAt,
          endAt: input.createdAt,
          precision: "instant",
          anchorAt: input.createdAt,
          source: input.referenceId ? "referenced_event" : "relation_fallback",
        },
      },
    },
  };
}

describe("Kaira world event retrieval coordinator contracts", () => {
  it("activates retrieval for temporal discourse markers", () => {
    expect(shouldCoordinateWorldEventRetrieval("peki sonra ne oldu?")).toBe(true);
    expect(shouldCoordinateWorldEventRetrieval("Ayşe en son ne dedi?")).toBe(true);
    expect(shouldCoordinateWorldEventRetrieval("naber")).toBe(false);
  });

  it("uses temporal graph mode and never lexical fallback for discourse queries", () => {
    const latest = observation({
      id: "latest",
      createdAt: "2026-08-21T10:00:00.000Z",
      raw: "Merve bana çok önemli bir şey söyledi",
    });
    const unrelatedLexical = observation({
      id: "old",
      createdAt: "2026-08-20T10:00:00.000Z",
      raw: "sonra ne oldu diye konuşmuştuk",
    });

    const result = coordinateWorldEventRetrieval({
      message: "peki sonra ne oldu?",
      sessionId: "session-1",
      observations: [latest, unrelatedLexical],
    });

    expect(result.mode).toBe("temporal_graph");
    expect(result.discourseResolution?.status).toBe("resolved");
    expect(result.items).toEqual([]);
  });

  it("returns graph evidence with explicit provenance reasons", () => {
    const first = observation({
      id: "a",
      createdAt: "2026-08-20T10:00:00.000Z",
    });
    const second = observation({
      id: "b",
      createdAt: "2026-08-21T10:00:00.000Z",
      referenceId: "a",
      direction: "after",
    });

    const result = coordinateWorldEventRetrieval({
      message: "ondan önce ne oldu?",
      sessionId: "session-1",
      observations: [second, first],
    });

    expect(result.mode).toBe("temporal_graph");
    expect(result.items.map((item) => item.observation.id)).toEqual(["a"]);
    expect(result.items[0].reasons).toEqual(
      expect.arrayContaining([
        "temporal_graph_neighbor",
        "discourse_anchor:b",
        "direction:before",
      ]),
    );
  });

  it("keeps ordinary recall on the existing ranking path", () => {
    const item = observation({
      id: "a",
      createdAt: "2026-08-20T10:00:00.000Z",
      raw: "Ayşe bana salak dedi",
    });
    item.event.actor = {
      name: "Ayşe",
      source: "explicit_name",
      confidence: 0.95,
    };

    const result = coordinateWorldEventRetrieval({
      message: "Ayşe ne dedi?",
      sessionId: "session-1",
      observations: [item],
      queryAnchorAt: "2026-08-30T10:00:00.000Z",
    });

    expect(result.mode).toBe("ranked_recall");
    expect(result.items.map((entry) => entry.observation.id)).toEqual(["a"]);
  });
});
