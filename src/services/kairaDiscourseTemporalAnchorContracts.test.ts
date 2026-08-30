import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  detectTemporalDiscourseDirection,
  resolveDiscourseTemporalAnchor,
  retrieveTemporalDiscourseNeighbors,
} from "./discourseTemporalAnchorResolver";

function observation(input: {
  id?: string;
  sessionId?: string;
  createdAt: string;
  referenceId?: string;
  direction?: "before" | "after";
}): WorldEventObservation {
  return {
    ...(input.id ? { id: input.id } : {}),
    userId: "user-1",
    sessionId: input.sessionId || "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    ...(input.referenceId ? { temporalReferenceObservationId: input.referenceId } : {}),
    event: {
      raw: input.id || "event",
      eventType: "general",
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      proposition: {
        key: `${input.id || "event"}|general|?`,
        predicate: "general",
        actorKey: input.id || "event",
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

describe("Kaira discourse temporal anchor contracts", () => {
  it("detects explicit before/after discourse markers only", () => {
    expect(detectTemporalDiscourseDirection("peki sonra ne oldu?")).toBe("after");
    expect(detectTemporalDiscourseDirection("ondan önce ne olmuştu?")).toBe("before");
    expect(detectTemporalDiscourseDirection("Ayşe ne dedi?")).toBeUndefined();
  });

  it("resolves the unique latest persisted observation in the same session", () => {
    const result = resolveDiscourseTemporalAnchor({
      message: "peki sonra ne oldu?",
      sessionId: "session-1",
      observations: [
        observation({ id: "old", createdAt: "2026-08-20T10:00:00.000Z" }),
        observation({ id: "latest", createdAt: "2026-08-20T11:00:00.000Z" }),
        observation({ id: "other", sessionId: "session-2", createdAt: "2026-08-20T12:00:00.000Z" }),
      ],
    });

    expect(result).toEqual({
      status: "resolved",
      direction: "after",
      anchorObservationId: "latest",
      reason: "resolved_latest_same_session_observation",
    });
  });

  it("preserves ambiguity when latest same-session observations share a timestamp", () => {
    const createdAt = "2026-08-20T11:00:00.000Z";
    const result = resolveDiscourseTemporalAnchor({
      message: "sonra ne oldu?",
      sessionId: "session-1",
      observations: [
        observation({ id: "a", createdAt }),
        observation({ id: "b", createdAt }),
      ],
    });

    expect(result.status).toBe("ambiguous");
    expect(result.anchorObservationId).toBeUndefined();
    expect(result.reason).toBe("latest_observation_time_ambiguous");
  });

  it("does not skip an id-less latest event to borrow an older anchor", () => {
    const result = resolveDiscourseTemporalAnchor({
      message: "peki sonra?",
      sessionId: "session-1",
      observations: [
        observation({ id: "older", createdAt: "2026-08-20T10:00:00.000Z" }),
        observation({ createdAt: "2026-08-20T11:00:00.000Z" }),
      ],
    });

    expect(result.status).toBe("unresolved");
    expect(result.anchorObservationId).toBeUndefined();
    expect(result.reason).toBe("latest_observation_missing_id");
  });

  it("does not resolve without an explicit temporal discourse marker", () => {
    const result = resolveDiscourseTemporalAnchor({
      message: "Ayşe ne dedi?",
      sessionId: "session-1",
      observations: [observation({ id: "a", createdAt: "2026-08-20T10:00:00.000Z" })],
    });
    expect(result).toEqual({
      status: "unresolved",
      reason: "no_temporal_discourse_marker",
    });
  });

  it("retrieves graph neighbors only after a resolved discourse anchor", () => {
    const anchor = observation({
      id: "a",
      createdAt: "2026-08-20T10:00:00.000Z",
    });
    const child = observation({
      id: "b",
      createdAt: "2026-08-21T10:00:00.000Z",
      referenceId: "a",
      direction: "after",
    });

    const result = retrieveTemporalDiscourseNeighbors({
      message: "ondan sonra ne oldu?",
      sessionId: "session-1",
      observations: [child, anchor],
    });

    expect(result.resolution.status).toBe("resolved");
    expect(result.resolution.anchorObservationId).toBe("b");
    expect(result.observations).toEqual([]);
  });
});
