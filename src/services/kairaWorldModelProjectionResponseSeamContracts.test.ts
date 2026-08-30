import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { buildWorldEventMemoryInstruction } from "./worldEventRetrieval";

function row(input: {
  id: string;
  at: string;
  polarity?: "positive" | "negative";
  modality?: "plan" | "unspecified";
  lifecycle?: "executed" | "unspecified";
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "u",
    kairaInstanceId: "kaira_a",
    sessionId: "s",
    speakerName: "Ali",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.at,
    event: {
      raw: input.id,
      eventType: "general",
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      polarity: input.polarity || "positive",
      temporal: { relation: "unspecified", asksLatest: false },
      proposition: {
        key: "ali|general|?|istifa",
        predicate: "general",
        actorKey: "ali",
        contentKey: "istifa",
      },
      modality: { kind: input.modality || "unspecified", strength: input.modality === "plan" ? 0.9 : 0 },
      lifecycle: {
        kind: input.lifecycle || "unspecified",
        strength: input.lifecycle === "executed" ? 0.9 : 0,
      },
    },
  };
}

const retrieved = (observation: WorldEventObservation) => ({
  observation,
  score: 10,
  reasons: ["grounded"],
});

describe("world-model projection -> response seam", () => {
  it("tells response generation that conflicting evidence is not truth", () => {
    const instruction = buildWorldEventMemoryInstruction([
      retrieved(row({ id: "önce evet", at: "2026-08-30T10:00:00.000Z", polarity: "positive" })),
      retrieved(row({ id: "sonra hayır", at: "2026-08-30T10:02:00.000Z", polarity: "negative" })),
    ]);

    expect(instruction).toContain("state=conflicting");
    expect(instruction).toContain("ÇELİŞEN KANIT");
    expect(instruction).toMatch(/doğrulanmış gerçek gibi anlatma/iu);
  });

  it("exposes lifecycle state from the same proposition generation", () => {
    const instruction = buildWorldEventMemoryInstruction([
      retrieved(row({ id: "yarın istifa edeceğim", at: "2026-08-30T10:00:00.000Z", modality: "plan" })),
      retrieved(row({ id: "istifa ettim", at: "2026-08-30T10:05:00.000Z", lifecycle: "executed" })),
    ]);

    expect(instruction).toContain("lifecycle=executed");
    expect(instruction).toMatch(/eski generation sonucunu yeni plana taşıma/iu);
  });
});
