import { describe, expect, it } from "vitest";
import { rankWorldEventObservations } from "./worldEventRetrieval";
import type { WorldEventObservation } from "./worldModelEventStore";

function observation(input: {
  id: string;
  raw: string;
  actorName?: string;
  targetName?: string;
  memoryFacts?: Array<{
    subjectId: string;
    attributeKey: string;
    value: string;
    confidence: number;
  }>;
}): WorldEventObservation {
  return {
    id: input.id,
    ownerUserId: "test-user",
    kairaInstanceId: "kaira_reference_001",
    kind: "direct_interaction",
    status: "grounded",
    observedAt: "2026-09-07T07:00:00.000Z",
    event: {
      raw: input.raw,
      eventType: "general",
      ...(input.actorName
        ? {
            actor: {
              id: "actor",
              name: input.actorName,
              source: "explicit_name",
              confidence: 0.98,
            },
          }
        : {}),
      ...(input.targetName
        ? {
            target: {
              id: "target",
              name: input.targetName,
              source: "explicit_name",
              confidence: 0.98,
            },
          }
        : {}),
      reportedSpeech: false,
      certainty: 0.96,
      ambiguities: [],
      evidence: [],
      proposition: {
        key: `${input.id}|general|?|?`,
        predicate: "general",
      },
      ...(input.memoryFacts ? { memoryFacts: input.memoryFacts } : {}),
      polarity: "positive",
      temporal: { relation: "unspecified", asksLatest: false },
    },
  } as WorldEventObservation;
}

const unrelated = observation({
  id: "unrelated-current-user",
  raw: "Mert kahve içiyor",
  actorName: "Mert",
  targetName: "KAIRO",
  memoryFacts: [
    {
      subjectId: "current_user",
      attributeKey: "current_activity",
      value: "drinking_coffee",
      confidence: 0.95,
    },
  ],
});

const matchingEce = observation({
  id: "ece-relationship",
  raw: "Mert ile Ece sevgili",
  actorName: "Mert",
  targetName: "Ece",
  memoryFacts: [
    {
      subjectId: "person:ece",
      attributeKey: "relationship_status_with_user",
      value: "dating",
      confidence: 0.95,
    },
  ],
});

describe("low-confidence canonical world-memory query regression", () => {
  it("fails closed instead of broadening a low-confidence typed query into unrelated world evidence", () => {
    const result = rankWorldEventObservations(
      "eceyle hala sevgilimi",
      [unrelated, matchingEce],
      5,
      "2026-09-07T07:33:52.000Z",
      {
        subjectId: "person:ece",
        attributeKey: "relationship_status_with_user",
        confidence: 0.7,
      },
    );

    expect(result).toEqual([]);
  });

  it("keeps exact structured fact retrieval when the same canonical query clears admission confidence", () => {
    const result = rankWorldEventObservations(
      "eceyle hala sevgilimi",
      [unrelated, matchingEce],
      5,
      "2026-09-07T07:33:52.000Z",
      {
        subjectId: "person:ece",
        attributeKey: "relationship_status_with_user",
        confidence: 0.9,
      },
    );

    expect(result.map((item) => item.observation.id)).toEqual(["ece-relationship"]);
    expect(result[0]?.reasons).toContain(
      "memory_fact:person:ece:relationship_status_with_user",
    );
  });

  it("preserves query-less legacy/general recall ranking instead of globally disabling lexical relevance", () => {
    const result = rankWorldEventObservations(
      "Mert kahve",
      [unrelated],
      5,
      "2026-09-07T07:33:52.000Z",
      null,
    );

    expect(result.map((item) => item.observation.id)).toEqual([
      "unrelated-current-user",
    ]);
  });
});
