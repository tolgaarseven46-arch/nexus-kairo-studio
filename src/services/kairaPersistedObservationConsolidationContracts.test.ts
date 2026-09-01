import { beforeEach, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ append: vi.fn(), revise: vi.fn() }));
const social = vi.hoisted(() => ({ appraise: vi.fn() }));
const activity = vi.hoisted(() => ({ project: vi.fn() }));

vi.mock("./kairaCanonicalIdentityStore", () => ({
  appendKairaAutobiographicalMemoryAtomic: identity.append,
  applyKairaSelfFactRevisionAtomic: identity.revise,
}));
vi.mock("./kairaLivedMemoryConsolidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaLivedMemoryConsolidation")>();
  return { ...actual, appraiseLivedMemoryCandidate: social.appraise };
});
vi.mock("./kairaActivityAutobiographicalProjection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivityAutobiographicalProjection")>();
  return { ...actual, projectKairaActivityObservationToAutobiography: activity.project };
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

const baseEvent = {
  raw: "canonical observation",
  eventType: "general" as const,
  actor: { id: "kaira_a", source: "first_person" as const, confidence: 1 },
  target: { id: "activity_theatre", source: "semantic_target" as const, confidence: 1 },
  reportedSpeech: false,
  certainty: 1,
  ambiguities: [],
  evidence: ["canonical_authority"],
};

const socialObservation = (overrides: Record<string, unknown> = {}) => ({
  id: "obs_social_01",
  userId: "user_a",
  kairaInstanceId: "kaira_a",
  sessionId: "chat_session",
  kind: "direct_interaction" as const,
  status: "grounded" as const,
  createdAt: "2026-09-01T10:00:00.000Z",
  event: baseEvent,
  ...overrides,
});

const activityObservation = (overrides: Record<string, unknown> = {}) => ({
  id: "obs_activity_01",
  userId: "system_activity",
  kairaInstanceId: "kaira_a",
  sessionId: "activity_session",
  kind: "kaira_activity" as const,
  status: "grounded" as const,
  createdAt: "2026-09-01T10:00:00.000Z",
  event: baseEvent,
  activity: {
    activityId: "theatre_01",
    activityType: "theatre",
    status: "completed" as const,
    experienceSubject: {
      preferenceKey: "preferred_performance_type",
      experiencedValue: "theatre",
    },
  },
  ...overrides,
});

const socialMemory = {
  id: "lived_obs_social_01",
  origin: "lived" as const,
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: ["user_a"],
  eventType: "support",
  facts: ["support"],
  emotions: [],
  salience: 0.8,
  sensitivity: "ordinary" as const,
  canonical: true as const,
  sourceWorldObservationIds: ["obs_social_01"],
  consolidationKey: "world:obs_social_01",
};

const activityMemory = {
  id: "lived_obs_activity_01",
  origin: "lived" as const,
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: [],
  eventType: "activity:theatre",
  facts: ["activity:theatre_01"],
  emotions: [{ label: "olumlu_deneyim", intensity: 0.84 }],
  salience: 0.86,
  sensitivity: "ordinary" as const,
  canonical: true as const,
  sourceWorldObservationIds: ["obs_activity_01"],
  consolidationKey: "world:obs_activity_01",
  selfRevisionEvidence: {
    evidenceId: "experience:obs_activity_01:preferred_performance_type",
    factKey: "preferred_performance_type",
    domain: "preference" as const,
    value: "theatre",
    confidence: 0.84,
    observedAt: "2026-09-01T10:00:00.000Z",
    sourceWorldObservationId: "obs_activity_01",
    authority: "kaira_experience_appraisal" as const,
  },
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
  social.appraise.mockReturnValue({
    status: "consolidate",
    score: 0.8,
    reasons: ["social_salience"],
    memory: socialMemory,
  });
  activity.project.mockReturnValue({
    status: "projected",
    score: 0.86,
    reasons: ["activity_salience:0.86"],
    memory: activityMemory,
    preferenceEvidenceStatus: "evidence",
    preferenceEvidenceReason: "qualified_direct_experience",
  });
});

describe("persisted observation autobiographical consolidation", () => {
  it("routes social interaction only through the social lived-memory authority", async () => {
    identity.append.mockResolvedValue({ status: "appended", memoryId: socialMemory.id });
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: socialObservation(),
      dynamicStateAfter,
    });
    expect(social.appraise).toHaveBeenCalledTimes(1);
    expect(activity.project).not.toHaveBeenCalled();
    expect(identity.append).toHaveBeenCalledWith(expect.anything(), socialMemory);
    expect(identity.revise).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "consolidated", consolidationDecision: "consolidate" });
  });

  it("routes Kaira activity only through the activity autobiographical authority", async () => {
    identity.append.mockResolvedValue({ status: "appended", memoryId: activityMemory.id });
    identity.revise.mockResolvedValue({ status: "unchanged", decision: { status: "insufficient_evidence" } });

    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: activityObservation(),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });

    expect(activity.project).toHaveBeenCalledWith(expect.objectContaining({
      observation: expect.objectContaining({ kind: "kaira_activity" }),
      receipt: activityReceipt,
    }));
    expect(social.appraise).not.toHaveBeenCalled();
    expect(identity.append).toHaveBeenCalledWith(expect.anything(), activityMemory);
    expect(identity.append.mock.invocationCallOrder[0]).toBeLessThan(identity.revise.mock.invocationCallOrder[0]);
    expect(identity.revise).toHaveBeenCalledWith(expect.objectContaining({ instanceId: "kaira_a" }), "preferred_performance_type");
    expect(result).toMatchObject({
      status: "consolidated",
      consolidationDecision: "projected",
      experiencePreferenceStatus: "projected",
      selfRevisionFactKey: "preferred_performance_type",
      selfRevisionStatus: "unchanged",
    });
  });

  it("never lets an activity receipt create learning on a social observation", async () => {
    identity.append.mockResolvedValue({ status: "appended", memoryId: socialMemory.id });
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: socialObservation(),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });
    expect(activity.project).not.toHaveBeenCalled();
    expect(identity.append).toHaveBeenCalledWith(expect.anything(), socialMemory);
    expect(identity.revise).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "consolidated",
      experiencePreferenceStatus: "rejected",
      experiencePreferenceReason: "activity_receipt_requires_kaira_activity",
    });
  });

  it("does not append autobiography when the activity projection rejects canonical provenance", async () => {
    activity.project.mockReturnValue({
      status: "skip_receipt_mismatch",
      score: 0,
      reasons: ["receipt_must_match_canonical_activity"],
      memory: null,
    });
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: activityObservation(),
      dynamicStateAfter,
      activityExperienceReceipt: { ...activityReceipt, sourceWorldObservationId: "obs_other" },
    });
    expect(social.appraise).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
    expect(identity.revise).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "candidate_rejected",
      consolidationDecision: "skip_receipt_mismatch",
    });
  });

  it("rejects an observation belonging to another Kaira before any autobiographical authority runs", async () => {
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: activityObservation({ kairaInstanceId: "kaira_b" }),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });
    expect(result).toEqual({ status: "observation_owner_mismatch", observationId: "obs_activity_01" });
    expect(social.appraise).not.toHaveBeenCalled();
    expect(activity.project).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
  });

  it("rejects a supposedly persisted observation without an id", async () => {
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: activityObservation({ id: undefined }),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });
    expect(result).toEqual({ status: "observation_invalid" });
    expect(social.appraise).not.toHaveBeenCalled();
    expect(activity.project).not.toHaveBeenCalled();
    expect(identity.append).not.toHaveBeenCalled();
  });

  it("does not consolidate persistent autobiography for Welcome Kaira", async () => {
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "welcome_1", instanceType: "welcome" },
      observation: activityObservation({ kairaInstanceId: "welcome_1" }),
      dynamicStateAfter,
      activityExperienceReceipt: { ...activityReceipt, kairaInstanceId: "welcome_1" },
    });
    expect(result).toEqual({ status: "not_applicable" });
    expect(social.appraise).not.toHaveBeenCalled();
    expect(activity.project).not.toHaveBeenCalled();
  });

  it("re-evaluates self revision on idempotent duplicate activity autobiography when typed evidence exists", async () => {
    identity.append.mockResolvedValue({ status: "duplicate", memoryId: activityMemory.id });
    identity.revise.mockResolvedValue({ status: "applied", decision: { status: "revised" } });
    const result = await consolidatePersistedWorldObservation({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation: activityObservation(),
      dynamicStateAfter,
      activityExperienceReceipt: activityReceipt,
    });
    expect(identity.revise).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "duplicate", selfRevisionStatus: "applied", selfRevisionDecision: "revised" });
  });
});
