import { describe, expect, it } from "vitest";
import { rankWorldEventObservations } from "./worldEventRetrieval";

const unrelated = {
  id: "unrelated-current-user",
  userId: "test-user",
  sessionId: "test-session",
  kairaInstanceId: "kaira_reference_001",
  kind: "direct_interaction",
  status: "grounded",
  createdAt: "2026-09-07T07:00:00.000Z",
  event: {
    raw: "Mert kahve içiyor",
    eventType: "general",
    actor: { id: "current_user", name: "Mert", source: "first_person", confidence: 1 },
    target: { id: "kaira", name: "KAIRO", source: "semantic_target", confidence: 0.98 },
    reportedSpeech: false,
    certainty: 0.96,
    ambiguities: [],
    evidence: [],
    proposition: { key: "current_user|general|kaira|?", predicate: "general" },
    polarity: "positive",
    temporal: { relation: "unspecified", asksLatest: false },
  },
} as any;

function retrieve(confidence: number) {
  return rankWorldEventObservations(
    "eceyle hala sevgilimi",
    [unrelated],
    5,
    "2026-09-07T07:33:52.000Z",
    {
      subjectId: "person:ece",
      attributeKey: "relationship_status_with_user",
      confidence,
    },
  );
}

describe("low-confidence world-memory bug-class neighbor proof", () => {
  it("reported: confidence 0.70 typed query fails closed", () => {
    expect(retrieve(0.7)).toEqual([]);
  });

  it("neighbor-1: confidence 0.69 typed query fails closed", () => {
    expect(retrieve(0.69)).toEqual([]);
  });

  it("neighbor-2: confidence 0.71 typed query fails closed", () => {
    expect(retrieve(0.71)).toEqual([]);
  });

  it("counterexample: query-less legacy/general recall remains available", () => {
    expect(
      rankWorldEventObservations(
        "Mert kahve",
        [unrelated],
        5,
        "2026-09-07T07:33:52.000Z",
        null,
      ).map((item) => item.observation.id),
    ).toEqual(["unrelated-current-user"]);
  });
});
