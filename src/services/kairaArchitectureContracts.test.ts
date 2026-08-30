import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent } from "./worldEventEngine";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  hasGroundedRecallEvidence,
  isRecallQuery,
  validateKairaArchitectureContracts,
  validateRetrievalContract,
} from "./kairaArchitectureContracts";

const observation = (
  raw: string,
  actor: string,
  createdAt: string,
): WorldEventObservation => ({
  userId: "mert",
  sessionId: "s1",
  speakerName: "Mert",
  kind: "reported_claim",
  status: "grounded",
  createdAt,
  event: {
    raw,
    eventType: raw.includes("salak") ? "insult" : "general",
    actor: { name: actor, source: "explicit_name", confidence: 0.9 },
    target: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
    reportedSpeech: true,
    certainty: 0.9,
    ambiguities: [],
    evidence: [`actor:${actor}`, "target:bana"],
  },
});

function pipeline(message: string) {
  const semantic = interpretSemanticEvent(message);
  const entities = resolveMessageEntities(message, {
    userName: "Mert",
    characterName: "KAIRO",
  });
  const worldEvent = buildCanonicalWorldEvent(message, semantic, entities);
  return { semantic, entities, worldEvent };
}

describe("Kaira architecture contracts v1", () => {
  it("treats concrete phrases as fixtures for general contracts", () => {
    for (const message of [
      "Ayşe bana salak dedi",
      "Merve bana iyi adamsın dedi",
      "Ayşe bana özür diledi",
      "Ayşe bana yine salak dedi",
    ]) {
      const state = pipeline(message);
      const report = validateKairaArchitectureContracts({
        message,
        ...state,
        retrieved: [],
      });
      expect(report.issues).toEqual([]);
      expect(report.accepted).toBe(true);
    }
  });

  it("keeps canonical world-event actor/target semantics stable", () => {
    const { worldEvent } = pipeline("Ayşe bana özür diledi");
    expect(worldEvent.eventType).toBe("apology");
    expect(worldEvent.actor?.name).toBe("Ayşe");
    expect(worldEvent.target?.name).toBe("Mert");
    expect(Object.values(worldEvent.actor || {})).not.toContain(undefined);
    expect(Object.values(worldEvent.target || {})).not.toContain(undefined);
  });

  it("defines recall queries independently from one exact sentence", () => {
    expect(isRecallQuery("Ayşe bana ne demişti?")).toBe(true);
    expect(isRecallQuery("Ayşe mi Merve mi bana salak demişti?")).toBe(true);
    expect(isRecallQuery("naber")).toBe(false);
  });

  it("requires every explicitly compared person to have retrieval evidence", () => {
    const message = "Ayşe mi Merve mi bana salak demişti?";
    const { entities } = pipeline(message);
    const ayse = observation("Ayşe bana salak dedi", "Ayşe", "2026-08-30T00:01:00Z");
    const onlyAyse = rankWorldEventObservations(message, [ayse], 5);
    const broken = validateRetrievalContract(message, entities, onlyAyse);
    expect(broken.accepted).toBe(false);
    expect(broken.issues.some((issue) => issue.invariant === "retrieval.multi_name_coverage")).toBe(true);

    const merve = observation("Merve bana iyi adamsın dedi", "Merve", "2026-08-30T00:02:00Z");
    const both = rankWorldEventObservations(message, [ayse, merve], 5);
    const valid = validateRetrievalContract(message, entities, both);
    expect(valid.accepted).toBe(true);
  });

  it("rejects legacy recall-question pollution as evidence", () => {
    const message = "Ayşe en son bana ne demişti?";
    const { entities } = pipeline(message);
    const polluted = observation("Ayşe bana ne demişti?", "Ayşe", "2026-08-30T00:03:00Z");
    const report = validateRetrievalContract(message, entities, [
      { observation: polluted, score: 10, reasons: ["name:ayşe"] },
    ]);
    expect(report.accepted).toBe(false);
    expect(report.issues.some((issue) => issue.invariant === "retrieval.no_query_pollution")).toBe(true);
  });

  it("marks grounded reported claims as sufficient recall evidence", () => {
    const item = observation("Ayşe bana yine salak dedi", "Ayşe", "2026-08-30T00:04:00Z");
    expect(
      hasGroundedRecallEvidence([
        { observation: item, score: 11, reasons: ["name:ayşe", "grounded"] },
      ]),
    ).toBe(true);
  });
});
