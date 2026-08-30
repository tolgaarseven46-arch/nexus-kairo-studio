import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { rankWorldEventObservations } from "./worldEventRetrieval";

const observation = (input: {
  raw: string;
  actor: string;
  createdAt: string;
  startAt?: string;
  endAt?: string;
}): WorldEventObservation => ({
  userId: "mert",
  sessionId: "temporal-retrieval",
  speakerName: "Mert",
  kind: "reported_claim",
  status: "grounded",
  createdAt: input.createdAt,
  event: {
    raw: input.raw,
    eventType: "general",
    actor: { name: input.actor, source: "explicit_name", confidence: 0.95 },
    target: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
    reportedSpeech: true,
    certainty: 0.95,
    ambiguities: [],
    evidence: [`actor:${input.actor}`],
    proposition: {
      key: `${input.actor.toLocaleLowerCase("tr-TR")}|general|current_user`,
      predicate: "general",
      actorKey: input.actor.toLocaleLowerCase("tr-TR"),
      targetKey: "current_user",
    },
    polarity: "positive",
    temporal: {
      relation: "past",
      asksLatest: false,
      ...(input.startAt && input.endAt
        ? {
            resolved: {
              startAt: input.startAt,
              endAt: input.endAt,
              precision: "day" as const,
              anchorAt: input.createdAt,
              source: "relative_marker" as const,
            },
          }
        : {}),
    },
  },
});

describe("Kaira temporal retrieval contracts", () => {
  it("filters a resolvable 'dün' recall to the matching event interval", () => {
    const yesterday = observation({
      raw: "Ayşe dün bana yazdı",
      actor: "Ayşe",
      createdAt: "2026-08-30T01:00:00.000Z",
      startAt: "2026-08-29T00:00:00.000Z",
      endAt: "2026-08-29T23:59:59.999Z",
    });
    const older = observation({
      raw: "Ayşe geçen hafta bana yazdı",
      actor: "Ayşe",
      createdAt: "2026-08-30T01:05:00.000Z",
      startAt: "2026-08-22T00:00:00.000Z",
      endAt: "2026-08-22T23:59:59.999Z",
    });

    const result = rankWorldEventObservations(
      "Ayşe dün bana ne demişti?",
      [older, yesterday],
      5,
      "2026-08-30T02:21:00.000Z",
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.observation.event.raw).toBe("Ayşe dün bana yazdı");
    expect(result[0]?.reasons).toContain("temporal_interval_match");
  });

  it("keeps legacy retrieval behavior when no stored event has resolved temporal data", () => {
    const legacy = observation({
      raw: "Ayşe bana yazdı",
      actor: "Ayşe",
      createdAt: "2026-08-29T10:00:00.000Z",
    });
    const result = rankWorldEventObservations(
      "Ayşe dün bana ne demişti?",
      [legacy],
      5,
      "2026-08-30T02:21:00.000Z",
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.observation).toBe(legacy);
  });

  it("falls back instead of returning false empty memory when resolved rows exist but none match", () => {
    const today = observation({
      raw: "Ayşe bugün bana yazdı",
      actor: "Ayşe",
      createdAt: "2026-08-30T01:00:00.000Z",
      startAt: "2026-08-30T00:00:00.000Z",
      endAt: "2026-08-30T23:59:59.999Z",
    });
    const result = rankWorldEventObservations(
      "Ayşe dün bana ne demişti?",
      [today],
      5,
      "2026-08-30T02:21:00.000Z",
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.observation).toBe(today);
    expect(result[0]?.reasons).not.toContain("temporal_interval_match");
  });
});
