import { beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({ save: vi.fn() }));
const consolidation = vi.hoisted(() => ({ consolidate: vi.fn() }));

vi.mock("./worldModelEventStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./worldModelEventStore")>();
  return { ...actual, saveKairaActivityWorldObservation: world.save };
});
vi.mock("./kairaPersistedObservationConsolidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaPersistedObservationConsolidation")>();
  return { ...actual, consolidatePersistedWorldObservation: consolidation.consolidate };
});

import { recordCompletedKairaActivityExperience } from "./kairaActivityExperienceCoordinator";

const persistedObservation = {
  id: "firestore_obs_123",
  userId: "user_a",
  kairaInstanceId: "kaira_a",
  sessionId: "activity_session",
  kind: "kaira_activity" as const,
  status: "grounded" as const,
  createdAt: "2026-09-01T12:00:00.000Z",
  event: {
    raw: "kaira_activity:theatre:completed",
    eventType: "general" as const,
    reportedSpeech: false,
    certainty: 1,
    ambiguities: [],
    evidence: ["authority:kaira_activity_executor"],
  },
  activity: {
    activityId: "theatre_01",
    activityType: "theatre",
    status: "completed" as const,
    experienceSubject: {
      preferenceKey: "preferred_performance_type",
      experiencedValue: "theatre",
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  world.save.mockResolvedValue(persistedObservation);
  consolidation.consolidate.mockResolvedValue({
    status: "consolidated",
    observationId: "firestore_obs_123",
  });
});

describe("Kaira completed activity experience coordinator contracts", () => {
  it("persists world truth before constructing receipt provenance and consolidating autobiography", async () => {
    const result = await recordCompletedKairaActivityExperience({
      authority: "kaira_activity_executor",
      userId: "user_a",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      sessionId: "activity_session",
      activityId: "Theatre 01",
      activityType: "Theatre",
      experienceSubject: {
        preferenceKey: "Preferred Performance Type",
        experiencedValue: " theatre ",
      },
      outcome: {
        outcomeValence: 0.84,
        appraisalConfidence: 0.9,
        attributionConfidence: 0.88,
      },
    });

    expect(world.save).toHaveBeenCalledWith(expect.objectContaining({
      kairaInstanceId: "kaira_a",
      activity: expect.objectContaining({ status: "completed" }),
    }));
    expect(world.save.mock.invocationCallOrder[0]).toBeLessThan(consolidation.consolidate.mock.invocationCallOrder[0]);
    expect(consolidation.consolidate).toHaveBeenCalledWith(expect.objectContaining({
      observation: persistedObservation,
      activityExperienceReceipt: {
        authority: "kaira_activity_executor",
        activityId: "theatre_01",
        kairaInstanceId: "kaira_a",
        sourceWorldObservationId: "firestore_obs_123",
        status: "completed",
        preferenceProbe: {
          preferenceKey: "preferred_performance_type",
          experiencedValue: "theatre",
        },
        outcome: {
          outcomeValence: 0.84,
          appraisalConfidence: 0.9,
          attributionConfidence: 0.88,
        },
      },
    }));
    expect(result.receipt.sourceWorldObservationId).toBe("firestore_obs_123");
  });

  it("can consolidate a completed autobiographical activity without a preference-learning subject", async () => {
    world.save.mockResolvedValue({
      ...persistedObservation,
      activity: {
        activityId: "walk_01",
        activityType: "walk",
        status: "completed" as const,
      },
    });

    const result = await recordCompletedKairaActivityExperience({
      authority: "kaira_activity_executor",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      sessionId: "activity_session",
      activityId: "walk_01",
      activityType: "walk",
      outcome: {
        outcomeValence: 0.72,
        appraisalConfidence: 0.86,
        attributionConfidence: 0.82,
      },
    });

    expect(result.receipt.preferenceProbe).toBeUndefined();
    expect(consolidation.consolidate).toHaveBeenCalledWith(expect.objectContaining({
      activityExperienceReceipt: expect.not.objectContaining({ preferenceProbe: expect.anything() }),
    }));
  });

  it("never consolidates when canonical world persistence fails", async () => {
    world.save.mockRejectedValue(new Error("firestore unavailable"));
    await expect(recordCompletedKairaActivityExperience({
      authority: "kaira_activity_executor",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      sessionId: "activity_session",
      activityId: "theatre_01",
      activityType: "theatre",
      outcome: {
        outcomeValence: 0.8,
        appraisalConfidence: 0.9,
        attributionConfidence: 0.9,
      },
    })).rejects.toThrow("firestore unavailable");
    expect(consolidation.consolidate).not.toHaveBeenCalled();
  });

  it("rejects malformed persistence responses instead of fabricating provenance", async () => {
    world.save.mockResolvedValue({ ...persistedObservation, id: undefined });
    await expect(recordCompletedKairaActivityExperience({
      authority: "kaira_activity_executor",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      sessionId: "activity_session",
      activityId: "theatre_01",
      activityType: "theatre",
      outcome: {
        outcomeValence: 0.8,
        appraisalConfidence: 0.9,
        attributionConfidence: 0.9,
      },
    })).rejects.toThrow("Canonical Kaira activity observation required");
    expect(consolidation.consolidate).not.toHaveBeenCalled();
  });
});
