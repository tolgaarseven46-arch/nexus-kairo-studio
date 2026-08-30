import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  resolvePropositionTemporalEventAnchor,
  retrievePropositionTemporalEventNeighbors,
} from "./propositionTemporalEventAnchorResolver";

function observation(input: {
  id: string;
  createdAt: string;
  actor: string;
  target: "current_user" | "kaira";
  eventType?: "insult" | "apology";
  polarity?: "positive" | "negative";
  contentKey?: string;
  referenceId?: string;
  direction?: "before" | "after";
}): WorldEventObservation {
  const eventType = input.eventType || "insult";
  const contentKey = input.contentKey || (eventType === "insult" ? "salak" : "apology");
  return {
    id: input.id,
    userId: "user-1",
    sessionId: "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    ...(input.referenceId ? { temporalReferenceObservationId: input.referenceId } : {}),
    event: {
      raw: `${input.actor} ${contentKey} event ${input.id}`,
      eventType,
      actor: {
        name: input.actor,
        source: "explicit_name",
        confidence: 0.95,
      },
      target: input.target === "current_user"
        ? {
            id: "current_user",
            name: "Mert",
            source: "first_person",
            confidence: 1,
          }
        : {
            id: "kaira",
            name: "Kaira",
            source: "second_person",
            confidence: 1,
          },
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      proposition: {
        key: `${input.actor.toLocaleLowerCase("tr-TR")}|${eventType}|${input.target}|${contentKey}`,
        predicate: eventType,
        actorKey: input.actor.toLocaleLowerCase("tr-TR"),
        targetKey: input.target,
        contentKey,
      },
      polarity: input.polarity || "positive",
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

describe("Kaira proposition temporal anchor contracts", () => {
  it("uses first-person target to disambiguate same actor and event type", () => {
    const toUser = observation({ id: "to-user", createdAt: "2026-08-20T10:00:00.000Z", actor: "Ayşe", target: "current_user" });
    const toKaira = observation({ id: "to-kaira", createdAt: "2026-08-20T11:00:00.000Z", actor: "Ayşe", target: "kaira" });

    const result = resolvePropositionTemporalEventAnchor({
      message: "Ayşe bana salak dedikten sonra ne oldu?",
      sessionId: "session-1",
      observations: [toKaira, toUser],
    });

    expect(result.status).toBe("resolved");
    expect(result.anchorObservationId).toBe("to-user");
    expect(result.matchedEventType).toBe("insult");
    expect(result.matchedContentKey).toBe("salak");
    expect(result.firstPersonTarget).toBe(true);
  });

  it("uses content identity to disambiguate same actor target and event type", () => {
    const salak = observation({ id: "salak", createdAt: "2026-08-20T10:00:00.000Z", actor: "Ayşe", target: "current_user", contentKey: "salak" });
    const aptal = observation({ id: "aptal", createdAt: "2026-08-20T11:00:00.000Z", actor: "Ayşe", target: "current_user", contentKey: "aptal" });

    const result = resolvePropositionTemporalEventAnchor({
      message: "Ayşe bana aptal dedikten sonra ne oldu?",
      sessionId: "session-1",
      observations: [salak, aptal],
    });

    expect(result.status).toBe("resolved");
    expect(result.anchorObservationId).toBe("aptal");
    expect(result.matchedContentKey).toBe("aptal");
  });

  it("preserves ambiguity when the same full proposition occurs more than once", () => {
    const a = observation({ id: "a", createdAt: "2026-08-20T10:00:00.000Z", actor: "Ayşe", target: "current_user" });
    const b = observation({ id: "b", createdAt: "2026-08-21T10:00:00.000Z", actor: "Ayşe", target: "current_user" });

    const result = resolvePropositionTemporalEventAnchor({
      message: "Ayşe bana salak dedikten sonra ne oldu?",
      sessionId: "session-1",
      observations: [b, a],
    });

    expect(result.status).toBe("ambiguous");
    expect(result.candidateObservationIds).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("uses polarity and never anchors a negated proposition to positive evidence", () => {
    const positive = observation({ id: "positive", createdAt: "2026-08-20T10:00:00.000Z", actor: "Ayşe", target: "current_user", polarity: "positive" });
    const negative = observation({ id: "negative", createdAt: "2026-08-21T10:00:00.000Z", actor: "Ayşe", target: "current_user", polarity: "negative" });

    const result = resolvePropositionTemporalEventAnchor({
      message: "Ayşe bana salak demedikten sonra ne oldu?",
      sessionId: "session-1",
      observations: [positive, negative],
    });

    expect(result.status).toBe("resolved");
    expect(result.anchorObservationId).toBe("negative");
    expect(result.matchedPolarity).toBe("negative");
  });

  it("retrieves graph neighbors only after a unique proposition anchor resolves", () => {
    const anchor = observation({ id: "anchor", createdAt: "2026-08-20T10:00:00.000Z", actor: "Ayşe", target: "current_user" });
    const next = observation({ id: "next", createdAt: "2026-08-21T10:00:00.000Z", actor: "Merve", target: "current_user", eventType: "apology", referenceId: "anchor", direction: "after" });

    const result = retrievePropositionTemporalEventNeighbors({
      message: "Ayşe bana salak dedikten sonra ne oldu?",
      sessionId: "session-1",
      observations: [next, anchor],
    });

    expect(result.resolution.status).toBe("resolved");
    expect(result.observations.map((item) => item.id)).toEqual(["next"]);
  });
});
