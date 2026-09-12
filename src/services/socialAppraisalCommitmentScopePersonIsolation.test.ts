import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import { buildSocialAppraisalCommitmentContext } from "./socialAppraisalWorldMemoryContext";

function commitmentObservation(input: {
  id: string;
  actorId: string;
  targetId: string;
  createdAt: string;
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "user:test",
    kairaInstanceId: "kaira",
    sessionId: "session:test",
    kind: "direct_interaction",
    status: "grounded",
    createdAt: input.createdAt,
    event: {
      raw: "commitment fixture",
      eventType: "general",
      actor: { id: input.actorId, source: "semantic_actor", confidence: 1 },
      target: { id: input.targetId, source: "semantic_target", confidence: 1 },
      reportedSpeech: false,
      certainty: 0.95,
      ambiguities: [],
      evidence: ["fixture"],
      proposition: {
        key: "commitment:shared_scope",
        predicate: "general",
        actorKey: input.actorId,
        targetKey: input.targetId,
        contentKey: "shared_scope",
      },
      polarity: "positive",
      temporal: { relation: "present", asksLatest: false },
      modality: { kind: "commitment", strength: 0.95 },
      lifecycle: { kind: "unspecified", strength: 0 },
    },
  } as unknown as WorldEventObservation;
}

describe("SocialAppraisal commitment world-memory person isolation", () => {
  it("preserves separate active commitments when actors differ but scopeKey matches", () => {
    const projected = buildSocialAppraisalCommitmentContext([
      commitmentObservation({
        id: "commitment-alice",
        actorId: "user:alice",
        targetId: "kaira",
        createdAt: "2026-09-12T10:00:00.000Z",
      }),
      commitmentObservation({
        id: "commitment-bob",
        actorId: "user:bob",
        targetId: "kaira",
        createdAt: "2026-09-12T11:00:00.000Z",
      }),
    ]);

    expect(projected).toHaveLength(2);
    expect(projected.map((item) => item.actorId).sort()).toEqual(["user:alice", "user:bob"]);
    expect(projected.every((item) => item.scopeKey === "commitment:shared_scope")).toBe(true);
    expect(projected.every((item) => item.counterpartyId === "kaira")).toBe(true);
    expect(projected.every((item) => item.state === "active")).toBe(true);
  });

  it("preserves separate active commitments when counterparties differ but actor/scope match", () => {
    const projected = buildSocialAppraisalCommitmentContext([
      commitmentObservation({
        id: "commitment-kaira",
        actorId: "user:alice",
        targetId: "kaira",
        createdAt: "2026-09-12T10:00:00.000Z",
      }),
      commitmentObservation({
        id: "commitment-third-party",
        actorId: "user:alice",
        targetId: "user:charlie",
        createdAt: "2026-09-12T11:00:00.000Z",
      }),
    ]);

    expect(projected).toHaveLength(2);
    expect(projected.map((item) => item.counterpartyId).sort()).toEqual(["kaira", "user:charlie"]);
    expect(projected.every((item) => item.actorId === "user:alice")).toBe(true);
    expect(projected.every((item) => item.scopeKey === "commitment:shared_scope")).toBe(true);
    expect(projected.every((item) => item.state === "active")).toBe(true);
  });
});
