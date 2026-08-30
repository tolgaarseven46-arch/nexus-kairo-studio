import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  groupTemporalEvidenceVariations,
  latestObservationForActor,
  orderObservationsByRecency,
  validateTemporalEvidenceContract,
} from "./temporalEvidencePolicy";
import { rankWorldEventObservations } from "./worldEventRetrieval";

const observation = (input: {
  actor?: string;
  raw: string;
  createdAt: string;
  eventType?: "insult" | "compliment" | "apology" | "general";
  kind?: "reported_claim" | "direct_interaction";
  status?: "grounded" | "ambiguous";
}): WorldEventObservation => ({
  userId: "mert",
  sessionId: "temporal-contract",
  speakerName: "Mert",
  kind: input.kind ?? "reported_claim",
  status: input.status ?? "grounded",
  createdAt: input.createdAt,
  event: {
    raw: input.raw,
    eventType: input.eventType ?? "general",
    actor: {
      name: input.actor ?? "Ayşe",
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
    evidence: [`actor:${input.actor ?? "Ayşe"}`, "target:bana"],
  },
});

function lcg(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const iso = (second: number) =>
  new Date(Date.UTC(2026, 7, 30, 3, 0, second)).toISOString();

describe("Kaira temporal evidence contracts", () => {
  it("makes timestamp authoritative for 'en son' even when an older row has stronger lexical overlap", () => {
    const olderLexicalMatch = observation({
      raw: "Ayşe bana en son salak dedi",
      createdAt: iso(1),
      eventType: "insult",
    });
    const newerDifferentClaim = observation({
      raw: "Ayşe bana iyi adamsın dedi",
      createdAt: iso(2),
      eventType: "general",
    });

    const ranked = rankWorldEventObservations(
      "Ayşe en son bana ne demişti?",
      [olderLexicalMatch, newerDifferentClaim],
      5,
    );

    expect(ranked[0]?.observation.event.raw).toBe("Ayşe bana iyi adamsın dedi");
  });

  it("keeps latest selection deterministic across 100 shuffled generated histories", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const random = lcg(seed);
      const rows: WorldEventObservation[] = [];
      for (let index = 0; index < 20; index += 1) {
        rows.push(observation({
          actor: index % 3 === 0 ? "Merve" : "Ayşe",
          raw: index % 2 === 0 ? "Ayşe bana salak dedi" : "Ayşe bana iyi adamsın dedi",
          createdAt: iso(index),
          eventType: index % 2 === 0 ? "insult" : "general",
        }));
      }

      for (let index = rows.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [rows[index], rows[swap]] = [rows[swap]!, rows[index]!];
      }

      const ayseRows = rows.filter((item) => item.event.actor?.name === "Ayşe");
      const expected = orderObservationsByRecency(ayseRows)[0];
      const latest = latestObservationForActor(rows, "Ayşe");
      expect(latest?.createdAt, `seed=${seed}`).toBe(expected?.createdAt);
    }
  });

  it("preserves time-varying evidence instead of collapsing it into synthetic truth", () => {
    const rows = [
      observation({ raw: "Ayşe bana salak dedi", createdAt: iso(1), eventType: "insult" }),
      observation({ raw: "Ayşe bana salak demediğini söyledi", createdAt: iso(2), eventType: "general" }),
      observation({ raw: "Ayşe bana özür diledi", createdAt: iso(3), eventType: "apology" }),
    ];

    const groups = groupTemporalEvidenceVariations(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.observations).toHaveLength(3);
    expect(groups[0]?.distinctRawClaims).toHaveLength(3);
    expect(groups[0]?.observations[0]?.event.raw).toBe("Ayşe bana özür diledi");
  });

  it("does not silently accept invalid timestamps as candidates for latest", () => {
    const rows = [
      observation({ raw: "Ayşe bana salak dedi", createdAt: "not-a-date", eventType: "insult" }),
      observation({ raw: "Ayşe bana iyi adamsın dedi", createdAt: iso(2), eventType: "general" }),
    ];

    expect(validateTemporalEvidenceContract(rows)).toEqual([
      expect.objectContaining({ invariant: "temporal.valid_timestamp" }),
    ]);
    expect(orderObservationsByRecency(rows)[0]?.createdAt).toBe(iso(2));
  });

  it("keeps epistemic kind/status untouched while ordering evidence", () => {
    const ambiguousClaim = observation({
      raw: "Ayşe galiba bana salak dedi",
      createdAt: iso(2),
      status: "ambiguous",
      kind: "reported_claim",
    });
    const direct = observation({
      raw: "Mert Kaira'ya özür diledi",
      createdAt: iso(1),
      kind: "direct_interaction",
      status: "grounded",
    });

    const ordered = orderObservationsByRecency([direct, ambiguousClaim]);
    expect(ordered[0]?.kind).toBe("reported_claim");
    expect(ordered[0]?.status).toBe("ambiguous");
    expect(ordered[1]?.kind).toBe("direct_interaction");
    expect(ordered[1]?.status).toBe("grounded");
  });
});
