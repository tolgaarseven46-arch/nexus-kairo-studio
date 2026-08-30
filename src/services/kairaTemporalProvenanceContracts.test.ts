import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  previousResolvedIntervalFromObservations,
  previousTemporalReferenceObservation,
} from "./worldModelEventStore";

function row(input: {
  id: string;
  sessionId: string;
  createdAt: string;
  resolved?: boolean;
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "mert",
    sessionId: input.sessionId,
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    event: {
      raw: "Ayşe geldi",
      eventType: "general",
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      proposition: { key: "ayşe|general|?", predicate: "general", actorKey: "ayşe" },
      polarity: "positive",
      temporal: {
        relation: "past",
        asksLatest: false,
        ...(input.resolved
          ? {
              resolved: {
                startAt: "2026-08-29T00:00:00.000Z",
                endAt: "2026-08-29T23:59:59.999Z",
                precision: "day",
                anchorAt: input.createdAt,
                source: "relative_marker",
              } as const,
            }
          : {}),
      },
    },
  };
}

describe("Kaira temporal provenance contracts", () => {
  it("selects the immediate previous observation in the same session", () => {
    const rows = [
      row({ id: "old", sessionId: "s1", createdAt: "2026-08-30T01:00:00.000Z", resolved: true }),
      row({ id: "other-session", sessionId: "s2", createdAt: "2026-08-30T01:45:00.000Z", resolved: true }),
      row({ id: "latest", sessionId: "s1", createdAt: "2026-08-30T01:30:00.000Z", resolved: true }),
    ];
    expect(previousTemporalReferenceObservation(rows, "s1")?.id).toBe("latest");
  });

  it("does not borrow an older resolved interval across an unresolved immediate event", () => {
    const rows = [
      row({ id: "old-resolved", sessionId: "s1", createdAt: "2026-08-30T01:00:00.000Z", resolved: true }),
      row({ id: "latest-unresolved", sessionId: "s1", createdAt: "2026-08-30T01:30:00.000Z" }),
    ];
    expect(previousTemporalReferenceObservation(rows, "s1")?.id).toBe("latest-unresolved");
    expect(previousResolvedIntervalFromObservations(rows, "s1")).toBeUndefined();
  });

  it("returns the resolved interval only from that selected reference observation", () => {
    const rows = [
      row({ id: "latest", sessionId: "s1", createdAt: "2026-08-30T01:30:00.000Z", resolved: true }),
    ];
    expect(previousResolvedIntervalFromObservations(rows, "s1")?.startAt)
      .toBe("2026-08-29T00:00:00.000Z");
  });
});
