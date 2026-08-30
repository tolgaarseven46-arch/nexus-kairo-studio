import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { rankWorldEventObservations } from "./worldEventRetrieval";

function row(input: {
  id: string;
  at: string;
  raw: string;
  polarity?: "positive" | "negative";
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "u",
    kairaInstanceId: "kaira_a",
    sessionId: "s",
    speakerName: "Mert",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.at,
    event: {
      raw: input.raw,
      eventType: "general",
      actor: { name: "Ali", source: "explicit_name", confidence: 0.95 },
      target: { name: "Mert", id: "current_user", source: "first_person", confidence: 1 },
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      polarity: input.polarity || "positive",
      temporal: { relation: "unspecified", asksLatest: false },
      proposition: {
        key: "ali|general|mert|istifa",
        predicate: "general",
        actorKey: "ali",
        targetKey: "mert",
        contentKey: "istifa",
      },
      modality: { kind: "unspecified", strength: 0 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  };
}

describe("projection-aware retrieval contracts", () => {
  it("prioritizes canonical current evidence over stale lexical overlap for current-state recall", () => {
    const rows = [
      row({
        id: "old",
        at: "2026-08-30T10:00:00.000Z",
        raw: "Ali hakkında istifa durumunu biliyorum",
        polarity: "positive",
      }),
      row({
        id: "new",
        at: "2026-08-30T10:05:00.000Z",
        raw: "Ali artık bunu yapmayacak",
        polarity: "negative",
      }),
    ];

    const retrieved = rankWorldEventObservations("Ali hakkında ne biliyorsun şu an?", rows, 2);

    expect(retrieved[0]?.observation.id).toBe("new");
    expect(retrieved[0]?.reasons).toContain("canonical_current_state:conflicting");
  });

  it("does not inject current-state projection ranking into historical reported-speech recall", () => {
    const rows = [
      row({ id: "old", at: "2026-08-30T10:00:00.000Z", raw: "Ali istifa edeceğini söyledi" }),
      row({ id: "new", at: "2026-08-30T10:05:00.000Z", raw: "Ali vazgeçti", polarity: "negative" }),
    ];

    const retrieved = rankWorldEventObservations("Ali ne demişti?", rows, 2);

    expect(retrieved).toHaveLength(2);
    expect(retrieved.flatMap((item) => item.reasons).some((reason) => reason.startsWith("canonical_"))).toBe(false);
  });

  it("keeps both sides visible when current canonical state is conflicting", () => {
    const rows = [
      row({ id: "yes", at: "2026-08-30T10:00:00.000Z", raw: "Ali istifa edecek", polarity: "positive" }),
      row({ id: "no", at: "2026-08-30T10:05:00.000Z", raw: "Ali istifa etmeyecek", polarity: "negative" }),
    ];

    const retrieved = rankWorldEventObservations("Ali hakkında ne biliyorsun?", rows, 2);
    const ids = new Set(retrieved.map((item) => item.observation.id));

    expect(ids).toEqual(new Set(["yes", "no"]));
    expect(retrieved.every((item) => item.reasons.includes("canonical_conflict_evidence"))).toBe(true);
  });
});
