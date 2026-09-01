import { beforeEach, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ append: vi.fn(), revise: vi.fn() }));
const consolidation = vi.hoisted(() => ({ appraise: vi.fn() }));

vi.mock("./kairaCanonicalIdentityStore", () => ({
  appendKairaAutobiographicalMemoryAtomic: identity.append,
  applyKairaSelfFactRevisionAtomic: identity.revise,
}));
vi.mock("./kairaLivedMemoryConsolidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaLivedMemoryConsolidation")>();
  return { ...actual, appraiseLivedMemoryCandidate: consolidation.appraise };
});

import { consolidatePersistedWorldObservation } from "./kairaPersistedObservationConsolidation";

const dynamicStateAfter = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 75,
  confidence: 70,
  surprise: 10,
  lastStatus: "positive experience",
  reactionMode: "neutral" as const,
  relationship: {
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    interactionCount: 10,
    warmth: 60,
    trust: 60,
    hurtScore: 0,
    conflictScore: 0,
  },
};

const observation = (overrides: Record<string, unknown> = {}) => ({
  id: "obs_activity_01",
  userId: "system_activity",
  kairaInstanceId: "kaira_a",
  sessionId: "activity_session",
  kind: "direct_interaction" as const,
  status: "grounded" as const,
  createdAt: "2026-09-01T10:00:00.000Z",
  event: {
    raw: "activity completed",
    eventType: "general" as const,
    actor: { id: "kaira_a", source: "first_person" as const, confidence: 1 },
    target: { id: "activity_theatre", source: "semantic_target" as const, confidence: 1 },
    reportedSpeech: false,
    certainty: 1,
    ambiguities: [],
    evidence: ["activity_executor"],
  },
  ...overrides,
});

const baseMemory = {
  id: "lived_obs_activity_01",
  origin: "lived" as const,
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: [],
  eventType: "activity_experience",
  facts: ["activity completed"],
  emotions: [],
  salience: 0.8,
  sensitivity: "ordinary" as const,
  canonical: true as const,
  sourceWorldObservationIds: ["obs_activity_01"],
  consolidationKey: "world:obs_activity_01",
};

const activityReceipt = {
  authority: "kaira_activity_executor" as const,
  activityId: "theatre_01",
  kairaInstanceId: "kaira_a",
  sourceWorldObservationId: "obs_activity_01",
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
  consolidation.appraise.mockReturnValue({
    status: "consolidate",
    score: 0.85,
    reasons: ["salient_activity"],
    memory: baseMemory,
  });
});

describe("persisted observation autobiographical consolidation", () => {
  it("projects trusted activity evidence, appends autobiography, then evaluates revision", async () => {
    identity.append.mockResolvedValue({ status: "appended", memoryId: baseMemory.id });
    identity.revise.mockResolvedValue({
      status: "unchanged",
      decision: { status: "insufficient_evidence" },
    });

    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: observation(),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });

    expect(identity.append).toHaveBeenCalledWith(
      expect.objectContaining({ instanceId: "kaira_a" }),
      expect.objectContaining({
        selfRevisionEvidence: expect.objectContaining({
          factKey: "preferred_performance_type",
          domain: "preference",
          value: "theatre",
        }),
      }),
    );
    expect(identity.append.mock.invocationCallOrder[0]).toBeLessThan(identity.revise.mock.invocationCallOrder[0]);
    expect(identity.revise).toHaveBeenCalledWith(
      expect.objectContaining({ instanceId: "kaira_a" }),
      "preferred_performance_type",
    );
    expect(result).toMatchObject({
      status: "consolidated",
      observationId: "obs_activity_01",
      experiencePreferenceStatus: "projected",
      selfRevisionFactKey: "preferred_performance_type",
      selfRevisionStatus: "unchanged",
      selfRevisionDecision: "insufficient_evidence",
    });
  });

  it("keeps autobiography but rejects learning when receipt provenance mismatches", async () => {
    identity.append.mockResolvedValue({ status: "appended", memoryId: baseMemory.id });

    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: observation(),
      dynamicStateAfter,
      activityExperienceReceipt: {
        ...activityReceipt,
        sourceWorldObservationId: "obs_other",
      },
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

  it("rejects an observation belonging to another Kaira before any identity mutation", async () => {
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: observation({ kairaInstanceId: "kaira_b" }),
      dynamicStateAfter,
    });
    expect(result).toEqual({ status: "observation_owner_mismatch", observationId: "obs_activity_01" });
    expect(consolidation.appraise).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
    expect(identity.revise).not.toHaveBeenCalled();
  });

  it("rejects a supposedly persisted observation without an id", async () => {
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: observation({ id: undefined }),
      dynamicStateAfter,
    });
    expect(result).toEqual({ status: "observation_invalid" });
    expect(consolidation.appraise).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
  });

  it("does not consolidate persistent autobiography for Welcome Kaira", async () => {
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "welcome_1", instanceType: "welcome" },
      observation: observation({ kairaInstanceId: "welcome_1" }),
      dynamicStateAfter,
    });
    expect(result).toEqual({ status: "not_applicable" });
    expect(consolidation.appraise).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
  });

  it("does not mutate identity when the lived-memory appraisal rejects the observation", async () => {
    consolidation.appraise.mockReturnValue({
      status: "reject_low_salience",
      score: 0.2,
      reasons: ["low_salience"],
    });
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: observation(),
      dynamicStateAfter,
    });
    expect(result).toMatchObject({
      status: "candidate_rejected",
      observationId: "obs_activity_01",
      score: 0.2,
    });
    expect(identity.append).not.toHaveBeenCalled();
    expect(identity.revise).not.toHaveBeenCalled();
  });

  it("re-evaluates self revision on idempotent duplicate autobiography when typed evidence exists", async () => {
    identity.append.mockResolvedValue({ status: "duplicate", memoryId: baseMemory.id });
    identity.revise.mockResolvedValue({
      status: "applied",
      decision: { status: "revised" },
    });
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: observation(),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });
    expect(identity.revise).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "duplicate",
      selfRevisionStatus: "applied",
      selfRevisionDecision: "revised",
    });
  });
});
