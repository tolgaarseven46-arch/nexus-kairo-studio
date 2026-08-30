import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { buildWorldEventMemoryInstruction } from "./worldEventRetrieval";

const observation = (input: {
  raw: string;
  polarity: "positive" | "negative";
  createdAt: string;
}): WorldEventObservation => ({
  userId: "mert",
  sessionId: "contradiction-response-seam",
  speakerName: "Mert",
  kind: "reported_claim",
  status: "grounded",
  createdAt: input.createdAt,
  event: {
    raw: input.raw,
    eventType: "insult",
    actor: { name: "Ayşe", source: "explicit_name", confidence: 0.95 },
    target: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
    reportedSpeech: true,
    certainty: 0.95,
    ambiguities: [],
    evidence: ["actor:Ayşe", "target:bana"],
    proposition: {
      key: "ayşe|insult|current_user",
      predicate: "insult",
      actorKey: "ayşe",
      targetKey: "current_user",
    },
    polarity: input.polarity,
    temporal: { relation: "past", asksLatest: false },
  },
});

describe("Kaira contradiction retrieval -> response seam", () => {
  it("surfaces both sides of a conflict without truth synthesis", () => {
    const older = observation({
      raw: "Ayşe bana salak dedi",
      polarity: "positive",
      createdAt: "2026-08-30T01:00:00.000Z",
    });
    const newer = observation({
      raw: "Ayşe bana salak demedi",
      polarity: "negative",
      createdAt: "2026-08-30T02:00:00.000Z",
    });

    const text = buildWorldEventMemoryInstruction([
      { observation: newer, score: 10, reasons: ["name:ayşe"] },
      { observation: older, score: 9, reasons: ["name:ayşe"] },
    ]);

    expect(text).toContain("Ayşe bana salak dedi");
    expect(text).toContain("Ayşe bana salak demedi");
    expect(text.match(/ÇELİŞEN KANIT/g)?.length).toBe(2);
    expect(text).toContain("polarity=positive");
    expect(text).toContain("polarity=negative");
    expect(text).toContain("güncel kanıt");
    expect(text).toContain("otomatik doğrulanmış gerçek sayma");
    expect(text).toContain("tek bir gerçeğe zorla birleştirme");
  });

  it("does not label one-sided evidence as conflicting", () => {
    const row = observation({
      raw: "Ayşe bana salak dedi",
      polarity: "positive",
      createdAt: "2026-08-30T01:00:00.000Z",
    });
    const text = buildWorldEventMemoryInstruction([
      { observation: row, score: 10, reasons: ["name:ayşe"] },
    ]);

    expect(text).not.toContain("; ÇELİŞEN KANIT");
  });
});
