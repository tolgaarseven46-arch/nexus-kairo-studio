import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import {
  enforceWorldModelRecallResponse,
  findWorldModelResponseIssues,
} from "./worldModelResponseGuard";

function row(input: {
  id: string;
  raw: string;
  at: string;
  polarity?: "positive" | "negative";
  status?: "grounded" | "ambiguous";
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "u",
    kairaInstanceId: "kaira_a",
    sessionId: "s",
    speakerName: "Mert",
    kind: "reported_claim",
    status: input.status || "grounded",
    createdAt: input.at,
    event: {
      raw: input.raw,
      eventType: "general",
      actor: { name: "Ali", source: "explicit_name", confidence: 0.95 },
      target: { name: "Mert", id: "current_user", source: "first_person", confidence: 1 },
      reportedSpeech: true,
      certainty: input.status === "ambiguous" ? 0.4 : 0.9,
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

describe("world-model response guard contracts", () => {
  it("cannot deny memory existence when grounded retrieval exists", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne demişti?",
      [row({ id: "a", raw: "Ali yarın istifa edeceğini söyledi", at: "2026-08-30T10:00:00.000Z" })],
      5,
    );

    const guarded = enforceWorldModelRecallResponse("Valla hatırlamıyorum, kaydım yok.", retrieved);

    expect(guarded.changed).toBe(true);
    expect(guarded.reason).toBe("world_model_grounded_evidence_guard");
    expect(guarded.reply).toContain("Ali yarın istifa edeceğini söyledi");
  });

  it("allows uncertainty for conflicting evidence but still forbids claiming no record exists", () => {
    const retrieved = rankWorldEventObservations(
      "Ali hakkında ne biliyorsun?",
      [
        row({ id: "yes", raw: "Ali istifa edecek", at: "2026-08-30T10:00:00.000Z", polarity: "positive" }),
        row({ id: "no", raw: "Ali istifa etmeyecek", at: "2026-08-30T10:05:00.000Z", polarity: "negative" }),
      ],
      2,
    );

    expect(findWorldModelResponseIssues("Emin değilim, iki farklı şey söylemişsin.", retrieved)).toEqual([]);

    const guarded = enforceWorldModelRecallResponse("Bununla ilgili kaydım yok.", retrieved);
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toMatch(/çelişen/iu);
  });

  it("does not force recall from ambiguous-only evidence", () => {
    const retrieved = rankWorldEventObservations(
      "Ali ne demişti?",
      [row({
        id: "amb",
        raw: "Ali bir şey söylemiş olabilir",
        at: "2026-08-30T10:00:00.000Z",
        status: "ambiguous",
      })],
      5,
    );

    const guarded = enforceWorldModelRecallResponse("Hatırlamıyorum.", retrieved);
    expect(guarded.changed).toBe(false);
  });
});
