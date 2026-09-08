import { describe, expect, it } from "vitest";
import { appraiseLivedMemoryCandidate } from "./kairaLivedMemoryConsolidation";

const instance = {
  instanceId: "kaira_reference_001",
  instanceType: "reference" as const,
};

const dynamicStateAfter = {
  calmness: 25,
  anger: 70,
  stress: 80,
  happiness: 20,
  confidence: 60,
  surprise: 10,
  lastStatus: "hurt",
  reactionMode: "hurt" as const,
  relationship: {
    warmth: 70,
    trust: 70,
    interactionCount: 20,
    conflictScore: 40,
    hurtScore: 60,
  },
  lastEvent: {
    eventTitle: "insult",
    reactionText: "hurt",
    deltas: [
      { label: "stress", key: "stress", value: 20 },
      { label: "happiness", key: "happiness", value: -20 },
      { label: "calmness", key: "calmness", value: -20 },
      { label: "anger", key: "anger", value: 20 },
    ],
  },
};

function observation(input: {
  id: string;
  userId: string;
  actorId: string;
  actorSource?: string;
  targetId: string;
  targetSource?: string;
}) {
  return {
    id: input.id,
    userId: input.userId,
    kairaInstanceId: instance.instanceId,
    sessionId: `session_${input.userId}`,
    kind: "direct_interaction",
    status: "grounded",
    createdAt: "2026-09-08T13:00:00.000Z",
    event: {
      raw: "fixture",
      eventType: "insult",
      actor: {
        id: input.actorId,
        source: input.actorSource ?? "first_person",
        confidence: 1,
      },
      target: {
        id: input.targetId,
        source: input.targetSource ?? "second_person",
        confidence: 1,
      },
      reportedSpeech: false,
      certainty: 1,
      ambiguities: [],
      evidence: ["fixture"],
      proposition: {
        key: `${input.actorId}|insult|${input.targetId}`,
        predicate: "insult",
        actorKey: input.actorId,
        targetKey: input.targetId,
        contentKey: "insult",
      },
      polarity: "positive",
      temporal: { relation: "present", confidence: 1 },
    },
  } as any;
}

function consolidate(row: any) {
  const result = appraiseLivedMemoryCandidate({
    instance,
    observation: row,
    dynamicStateAfter: dynamicStateAfter as any,
  });
  expect(result.status).toBe("consolidate");
  expect(result.memory).not.toBeNull();
  return result.memory!;
}

describe("stable autobiographical participant identity historical proof", () => {
  it("reported: two users do not collapse to current_user in autobiographical memory", () => {
    const alice = consolidate(observation({
      id: "obs_alice",
      userId: "alice",
      actorId: "current_user",
      targetId: instance.instanceId,
    }));
    const bob = consolidate(observation({
      id: "obs_bob",
      userId: "bob",
      actorId: "current_user",
      targetId: instance.instanceId,
    }));

    expect(alice.participantIds).toEqual(["user:alice"]);
    expect(bob.participantIds).toEqual(["user:bob"]);
    expect(alice.participantIds).not.toEqual(bob.participantIds);
  });

  it("neighbor-1: current_user actor is scoped to the observation owner", () => {
    const memory = consolidate(observation({
      id: "obs_actor",
      userId: "owner_actor",
      actorId: "current_user",
      targetId: instance.instanceId,
    }));
    expect(memory.participantIds).toEqual(["user:owner_actor"]);
  });

  it("neighbor-2: current_user target is scoped to the observation owner", () => {
    const memory = consolidate(observation({
      id: "obs_target",
      userId: "owner_target",
      actorId: instance.instanceId,
      actorSource: "second_person",
      targetId: "current_user",
      targetSource: "first_person",
    }));
    expect(memory.participantIds).toEqual(["user:owner_target"]);
  });

  it("counterexample: named third-party participant identity remains unchanged", () => {
    const memory = consolidate(observation({
      id: "obs_named",
      userId: "owner_named",
      actorId: "mert",
      actorSource: "third_person",
      targetId: instance.instanceId,
      targetSource: "second_person",
    }));
    expect(memory.participantIds).toEqual(["mert"]);
  });
});
