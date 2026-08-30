import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  resolveExplicitTemporalEventAnchor,
  retrieveExplicitTemporalEventNeighbors,
} from "./explicitTemporalEventAnchorResolver";

function observation(input: {
  id: string;
  actor: string;
  eventType: "apology" | "insult" | "general";
  createdAt: string;
  sessionId?: string;
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
    ...(input.referenceId ? { temporalReferenceObservationId: input.referenceId } : {}),
    event: {
      raw:
        input.eventType === "apology"
          ? `${input.actor} bana özür diledi`
          : input.eventType === "insult"
            ? `${input.actor} bana salak dedi`
            : `${input.actor} bir şey yaptı`,
      eventType: input.eventType,
      actor: {
        name: input.actor,
        source: "explicit_name",
        confidence: 0.95,
      },
      target: {
        id: "current_user",
        name: "Mert",
        source: "first_person",
        confidence: 1,
      },
      reportedSpeech: true,
      certainty: 0.95,
      ambiguities: [],
      evidence: [],
      proposition: {
        key: `${input.actor.toLocaleLowerCase("tr-TR")}|${input.eventType}|current_user`,
        predicate: input.eventType,
        actorKey: input.actor.toLocaleLowerCase("tr-TR"),
        targetKey: "current_user",
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

describe("Kaira explicit temporal event anchor contracts", () => {
  it("resolves a unique named canonical event type instead of the latest event", () => {
    const apology = observation({
      id: "ayse-apology",
      actor: "Ayşe",
      eventType: "apology",
      createdAt: "2026-08-20T10:00:00.000Z",
    });
    const insult = observation({
      id: "ayse-insult",
      actor: "Ayşe",
      eventType: "insult",
      createdAt: "2026-08-21T10:00:00.000Z",
    });

    const result = resolveExplicitTemporalEventAnchor({
      message: "Ayşe'nin özründen sonra ne oldu?",
      sessionId: "session-1",
      observations: [insult, apology],
    });

    expect(result.status).toBe("resolved");
    expect(result.anchorObservationId).toBe("ayse-apology");
    expect(result.matchedEventType).toBe("apology");
  });

  it("preserves ambiguity when a named person has multiple events and no event discriminator", () => {
    const result = resolveExplicitTemporalEventAnchor({
      message: "Ayşe'den sonra ne oldu?",
      sessionId: "session-1",
      observations: [
        observation({
          id: "a",
          actor: "Ayşe",
          eventType: "apology",
          createdAt: "2026-08-20T10:00:00.000Z",
        }),
        observation({
          id: "b",
          actor: "Ayşe",
          eventType: "insult",
          createdAt: "2026-08-21T10:00:00.000Z",
        }),
      ],
    });

    expect(result.status).toBe("ambiguous");
    expect(result.anchorObservationId).toBeUndefined();
    expect(result.reason).toBe("named_anchor_not_unique");
  });

  it("never borrows a matching event from another session", () => {
    const result = resolveExplicitTemporalEventAnchor({
      message: "Ayşe'nin özründen sonra ne oldu?",
      sessionId: "session-1",
      observations: [
        observation({
          id: "other-session-apology",
          actor: "Ayşe",
          eventType: "apology",
          createdAt: "2026-08-20T10:00:00.000Z",
          sessionId: "session-2",
        }),
      ],
    });

    expect(result.status).toBe("unresolved");
    expect(result.anchorObservationId).toBeUndefined();
  });

  it("retrieves graph neighbors from the explicit event anchor", () => {
    const apology = observation({
      id: "a",
      actor: "Ayşe",
      eventType: "apology",
      createdAt: "2026-08-20T10:00:00.000Z",
    });
    const next = observation({
      id: "b",
      actor: "Merve",
      eventType: "general",
      createdAt: "2026-08-21T10:00:00.000Z",
      referenceId: "a",
      direction: "after",
    });

    const result = retrieveExplicitTemporalEventNeighbors({
      message: "Ayşe'nin özründen sonra ne oldu?",
      sessionId: "session-1",
      observations: [next, apology],
    });

    expect(result.resolution.status).toBe("resolved");
    expect(result.observations.map((item) => item.id)).toEqual(["b"]);
  });
});
