import { beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({ save: vi.fn() }));
const identity = vi.hoisted(() => ({ append: vi.fn(), revise: vi.fn() }));
const consolidation = vi.hoisted(() => ({ appraise: vi.fn() }));

vi.mock("./worldModelEventStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./worldModelEventStore")>();
  return { ...actual, saveWorldEventObservation: world.save };
});
vi.mock("./kairaCanonicalIdentityStore", () => ({
  appendKairaAutobiographicalMemoryAtomic: identity.append,
  applyKairaSelfFactRevisionAtomic: identity.revise,
}));
vi.mock("./kairaLivedMemoryConsolidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaLivedMemoryConsolidation")>();
  return { ...actual, appraiseLivedMemoryCandidate: consolidation.appraise };
});

import { persistWorldEventAndMaybeConsolidateLivedMemory } from "./kairaLivedMemoryRuntime";

const event = {
  raw: "salaksın",
  eventType: "insult" as const,
  actor: { id: "user_1", source: "first_person" as const, confidence: 1 },
  target: { id: "kaira_1", source: "second_person" as const, confidence: 1 },
  reportedSpeech: false,
  certainty: 0.95,
  ambiguities: [],
  evidence: ["direct"],
  proposition: { key: "user_1|insult|kaira_1|salak", predicate: "insult" as const, actorKey: "user_1", targetKey: "kaira_1", contentKey: "salak" },
  polarity: "positive" as const,
  temporal: { relation: "present" as const, asksLatest: false },
};
const dynamicStateAfter = {
  calmness: 30,
  anger: 75,
  stress: 70,
  happiness: 25,
  confidence: 60,
  surprise: 15,
  lastStatus: "hurt",
  reactionMode: "hurt" as const,
  lastEvent: { eventTitle: "insult", reactionText: "hurt", deltas: [{ label: "stress", key: "stress", value: 15 }] },
  relationship: { firstSeenAt: "2026-08-01T00:00:00.000Z", interactionCount: 50, warmth: 80, trust: 75, hurtScore: 45, conflictScore: 35 },
};
const persistedObservation = {
  id: "obs_1",
  userId: "user_1",
  kairaInstanceId: "kaira_1",
  sessionId: "s1",
  kind: "direct_interaction" as const,
  status: "grounded" as const,
  event,
  createdAt: "2026-09-01T10:00:00.000Z",
};
const baseMemory = {
  id: "lived_obs_1",
  origin: "lived" as const,
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: ["user_1"],
  eventType: "insult",
  facts: ["salak"],
  emotions: [{ label: "kırgınlık", intensity: 0.7 }],
  salience: 0.8,
  sensitivity: "ordinary" as const,
  canonical: true as const,
  sourceWorldObservationIds: ["obs_1"],
  consolidationKey: "world:obs_1",
};
const activityReceipt = {
  authority: "kaira_activity_executor" as const,
  activityId: "theatre_01",
  kairaInstanceId: "kaira_1",
  sourceWorldObservationId: "obs_1",
  status: "completed" as const,
  preferenceProbe: {
    preferenceKey: "preferred_performance_type",
    experiencedValue: "theatre",
  },
  outcome: {
    outcomeValence: 0.84,
    appraisalConfidence: 0.9,
    attributionConfidence: 0.88,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  consolidation.appraise.mockReturnValue({ status: "consolidate", score: 0.8, reasons: ["test"], memory: baseMemory });
});

describe("lived autobiographical runtime coordinator", () => {
  it("persists world truth before appending the lived projection", async () => {
    world.save.mockResolvedValue(persistedObservation);
    identity.append.mockResolvedValue({ status: "appended", memoryId: "lived_obs_1" });
    await expect(persistWorldEventAndMaybeConsolidateLivedMemory({
      userId: "user_1", instance: { instanceId: "kaira_1", instanceType: "individual" }, sessionId: "s1", event, dynamicStateAfter,
    })).resolves.toMatchObject({ status: "consolidated", observationId: "obs_1", memoryId: "lived_obs_1" });
    expect(world.save.mock.invocationCallOrder[0]).toBeLessThan(identity.append.mock.invocationCallOrder[0]);
    expect(identity.revise).not.toHaveBeenCalled();
  });

  it("projects a trusted activity receipt into lived preference evidence before atomic revision", async () => {
    world.save.mockResolvedValue(persistedObservation);
    identity.append.mockResolvedValue({ status: "appended", memoryId: "lived_obs_1" });
    identity.revise.mockResolvedValue({ status: "unchanged", decision: { status: "insufficient_evidence" } });

    const result = await persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "kaira_1", instanceType: "individual" },
      sessionId: "s1",
      event,
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });

    expect(identity.append).toHaveBeenCalledWith(
      expect.objectContaining({ instanceId: "kaira_1" }),
      expect.objectContaining({
        selfRevisionEvidence: expect.objectContaining({
          factKey: "preferred_performance_type",
          domain: "preference",
          value: "theatre",
        }),
      }),
    );
    expect(identity.append.mock.invocationCallOrder[0]).toBeLessThan(identity.revise.mock.invocationCallOrder[0]);
    expect(identity.revise).toHaveBeenCalledWith(expect.objectContaining({ instanceId: "kaira_1" }), "preferred_performance_type");
    expect(result).toMatchObject({
      status: "consolidated",
      experiencePreferenceStatus: "projected",
      selfRevisionFactKey: "preferred_performance_type",
      selfRevisionStatus: "unchanged",
    });
  });

  it("fails closed on an activity receipt whose world provenance does not match the lived episode", async () => {
    world.save.mockResolvedValue(persistedObservation);
    identity.append.mockResolvedValue({ status: "appended", memoryId: "lived_obs_1" });

    const result = await persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "kaira_1", instanceType: "individual" },
      sessionId: "s1",
      event,
      dynamicStateAfter,
      activityExperienceReceipt: { ...activityReceipt, sourceWorldObservationId: "obs_other" },
    });

    expect(identity.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ selfRevisionEvidence: expect.anything() }),
    );
    expect(identity.revise).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "consolidated",
      experiencePreferenceStatus: "rejected",
      experiencePreferenceReason: "provenance_mismatch",
    });
  });

  it("applies self revision only after a canonical lived memory carrying typed evidence", async () => {
    world.save.mockResolvedValue(persistedObservation);
    consolidation.appraise.mockReturnValue({
      status: "consolidate", score: 0.9, reasons: ["typed_self_evidence"],
      memory: { ...baseMemory, selfRevisionEvidence: { factKey: "preferred_music", domain: "preference", value: "ambient", confidence: 0.9 } },
    });
    identity.append.mockResolvedValue({ status: "appended", memoryId: "lived_obs_1" });
    identity.revise.mockResolvedValue({ status: "unchanged", decision: { status: "insufficient_evidence" } });

    const result = await persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "kaira_1", instanceType: "individual" }, sessionId: "s1", event, dynamicStateAfter,
    });
    expect(identity.append.mock.invocationCallOrder[0]).toBeLessThan(identity.revise.mock.invocationCallOrder[0]);
    expect(identity.revise).toHaveBeenCalledWith(expect.objectContaining({ instanceId: "kaira_1" }), "preferred_music");
    expect(result).toMatchObject({ status: "consolidated", selfRevisionFactKey: "preferred_music", selfRevisionStatus: "unchanged", selfRevisionDecision: "insufficient_evidence" });
  });

  it("does not touch autobiography when the world event is not persisted", async () => {
    world.save.mockResolvedValue(null);
    await expect(persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "kaira_1", instanceType: "individual" }, sessionId: "s1", event, dynamicStateAfter,
    })).resolves.toEqual({ status: "world_event_skipped" });
    expect(identity.append).not.toHaveBeenCalled();
    expect(identity.revise).not.toHaveBeenCalled();
  });

  it("keeps world persistence even when canonical identity is unavailable", async () => {
    world.save.mockResolvedValue(persistedObservation);
    identity.append.mockRejectedValue(new Error("firestore identity outage"));
    await expect(persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "kaira_1", instanceType: "individual" }, sessionId: "s1", event, dynamicStateAfter,
    })).resolves.toMatchObject({ status: "identity_unavailable", observationId: "obs_1" });
  });

  it("surfaces missing provisioning instead of silently creating identity", async () => {
    world.save.mockResolvedValue(persistedObservation);
    identity.append.mockResolvedValue({ status: "missing_identity", memoryId: null });
    await expect(persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "kaira_1", instanceType: "individual" }, sessionId: "s1", event, dynamicStateAfter,
    })).resolves.toMatchObject({ status: "identity_missing", observationId: "obs_1" });
  });

  it("does not persist anything for Welcome Kaira", async () => {
    await expect(persistWorldEventAndMaybeConsolidateLivedMemory({
      instance: { instanceId: "welcome_1", instanceType: "welcome" }, sessionId: "s1", event, dynamicStateAfter,
    })).resolves.toEqual({ status: "not_applicable" });
    expect(world.save).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
    expect(identity.revise).not.toHaveBeenCalled();
  });
});
