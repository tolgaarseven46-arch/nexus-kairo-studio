import { describe, expect, it } from "vitest";
import {
  DEFAULT_KAIRA_INSTANCE_ID,
  instancePolicy,
  memoryCacheKey,
  resolveKairaInstanceContext,
  stateOwnerScope,
  userMemoryOwnerScope,
  worldModelOwnerScope,
} from "./kairaInstanceContext";
import { evaluateKairaKnowledge } from "./kairaEpistemicGate";
import { selectOwnedObservations } from "./worldModelOwnershipPolicy";
import {
  observationKairaInstanceId,
  previousTemporalReferenceObservation,
  type WorldEventObservation,
} from "./worldModelEventStore";

function observation(id: string, instanceId?: string): WorldEventObservation {
  return {
    id,
    userId: "user-1",
    kairaInstanceId: instanceId,
    sessionId: "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: id === "new" ? "2026-08-30T10:01:00.000Z" : "2026-08-30T10:00:00.000Z",
    event: {
      raw: id,
      eventType: "general",
      reportedSpeech: true,
      certainty: 1,
      ambiguities: [],
      evidence: [],
      polarity: "positive",
      temporal: { relation: "unspecified", asksLatest: false },
      proposition: {
        key: `user|general|?|${id}`,
        predicate: "general",
        actorKey: "user",
        contentKey: id,
      },
    },
  };
}

describe("Kaira multi-instance foundation contracts", () => {
  it("keeps legacy reference Kaira on the existing owner scope", () => {
    expect(worldModelOwnerScope("user-1")).toBe("user-1");
    expect(stateOwnerScope("user-1")).toBe("user-1");
    expect(userMemoryOwnerScope("user-1")).toBe("user-1");
    expect(resolveKairaInstanceContext().instanceId).toBe(DEFAULT_KAIRA_INSTANCE_ID);
  });

  it("gives different Kaira instances physically separate persistent scopes", () => {
    for (const scope of [worldModelOwnerScope, stateOwnerScope, userMemoryOwnerScope, memoryCacheKey]) {
      expect(scope("user-1", "kaira_a")).toBe("user-1__kaira_a");
      expect(scope("user-1", "kaira_b")).toBe("user-1__kaira_b");
      expect(scope("user-1", "kaira_a")).not.toBe(scope("user-1", "kaira_b"));
    }
  });

  it("keeps Welcome Kaira intentionally lightweight, non-biographical and non-autonomous", () => {
    expect(instancePolicy("welcome")).toEqual({
      persistentIdentity: false,
      persistentAutobiography: false,
      persistentWorldModel: false,
      persistentRelationship: false,
      persistentUserMemory: false,
      canConsolidateCoreMemories: false,
      autonomousActivityPlanning: false,
      purpose: "onboarding",
    });
  });

  it("allows Individual Kaira to own a durable autonomous life", () => {
    const policy = instancePolicy("individual");
    expect(policy.persistentIdentity).toBe(true);
    expect(policy.persistentAutobiography).toBe(true);
    expect(policy.persistentWorldModel).toBe(true);
    expect(policy.persistentRelationship).toBe(true);
    expect(policy.persistentUserMemory).toBe(true);
    expect(policy.canConsolidateCoreMemories).toBe(true);
    expect(policy.autonomousActivityPlanning).toBe(true);
  });

  it("treats legacy observations without instance id as reference Kaira only", () => {
    const legacy = observation("legacy");
    expect(observationKairaInstanceId(legacy)).toBe(DEFAULT_KAIRA_INSTANCE_ID);
    expect(selectOwnedObservations([legacy], { ownerUserId: "user-1" })).toHaveLength(1);
    expect(selectOwnedObservations([legacy], { ownerUserId: "user-1", kairaInstanceId: "kaira_b" })).toHaveLength(0);
  });

  it("never mixes memories between two Kaira instances owned by the same user", () => {
    const a = observation("a", "kaira_a");
    const b = observation("b", "kaira_b");
    expect(selectOwnedObservations([a, b], {
      ownerUserId: "user-1",
      kairaInstanceId: "kaira_a",
    }).map((item) => item.id)).toEqual(["a"]);
  });

  it("never borrows previous-event temporal provenance from another Kaira", () => {
    const oldA = observation("old", "kaira_a");
    const newB = observation("new", "kaira_b");
    expect(previousTemporalReferenceObservation([newB, oldA], "session-1", "kaira_a")?.id).toBe("old");
  });

  it("keeps the epistemic gate behavior-compatible until real knowledge state is added", () => {
    expect(evaluateKairaKnowledge({
      kairaInstanceId: "kaira_a",
      surface: "patlıcan oturtması",
    })).toEqual({ status: "known", source: "legacy_allow_all", confidence: 1 });
  });
});
