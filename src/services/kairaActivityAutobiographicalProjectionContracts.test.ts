import { describe, expect, it } from "vitest";
import { projectKairaActivityObservationToAutobiography } from "./kairaActivityAutobiographicalProjection";
import type { KairaActivityExecutionReceipt } from "./kairaActivityExperienceReceipt";
import type { WorldEventObservation } from "./worldModelEventStore";

const observation = (overrides: Partial<WorldEventObservation> = {}): WorldEventObservation => ({
  id: "obs_activity_01",
  userId: "system_activity",
  kairaInstanceId: "kaira_a",
  sessionId: "activity_session",
  kind: "kaira_activity",
  status: "grounded",
  createdAt: "2026-09-01T10:00:00.000Z",
  event: {
    raw: "Kaira completed theatre activity",
    eventType: "general",
    actor: { id: "kaira_a", source: "explicit_name", confidence: 1 },
    target: { id: "theatre", source: "semantic_target", confidence: 1 },
    reportedSpeech: false,
    certainty: 1,
    ambiguities: [],
    evidence: ["kaira_activity_executor"],
  },
  activity: {
    activityId: "theatre_01",
    activityType: "theatre",
    status: "completed",
    experienceSubject: {
      preferenceKey: "preferred_performance_type",
      experiencedValue: "theatre",
    },
  },
  ...overrides,
});

const receipt = (overrides: Partial<KairaActivityExecutionReceipt> = {}): KairaActivityExecutionReceipt => ({
  authority: "kaira_activity_executor",
  activityId: "theatre_01",
  kairaInstanceId: "kaira_a",
  sourceWorldObservationId: "obs_activity_01",
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
  ...overrides,
});

const individual = { instanceId: "kaira_a", instanceType: "individual" as const };

describe("Kaira activity autobiographical projection contracts", () => {
  it("projects a completed grounded owned activity with exact trusted provenance", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation(),
      receipt: receipt(),
    });
    expect(result.status).toBe("projected");
    expect(result.preferenceEvidenceStatus).toBe("evidence");
    expect(result.memory).toMatchObject({
      id: "lived_obs_activity_01",
      origin: "lived",
      eventType: "activity:theatre",
      sourceWorldObservationIds: ["obs_activity_01"],
      selfRevisionEvidence: {
        factKey: "preferred_performance_type",
        domain: "preference",
        value: "theatre",
      },
    });
  });

  it("keeps a salient negative experience as autobiography without inventing a negative preference fact", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation(),
      receipt: receipt({
        outcome: {
          outcomeValence: -0.9,
          appraisalConfidence: 0.95,
          attributionConfidence: 0.92,
        },
      }),
    });
    expect(result.status).toBe("projected");
    expect(result.preferenceEvidenceStatus).toBe("rejected");
    expect(result.preferenceEvidenceReason).toBe("weak_or_negative_outcome");
    expect(result.memory?.emotions[0]?.label).toBe("olumsuz_deneyim");
    expect(result.memory?.selfRevisionEvidence).toBeUndefined();
  });

  it("rejects a receipt whose world observation provenance differs", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation(),
      receipt: receipt({ sourceWorldObservationId: "obs_other" }),
    });
    expect(result.status).toBe("skip_receipt_mismatch");
    expect(result.memory).toBeNull();
  });

  it("rejects a receipt that changes the canonical experience subject", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation(),
      receipt: receipt({
        preferenceProbe: {
          preferenceKey: "preferred_food",
          experiencedValue: "pizza",
        },
      }),
    });
    expect(result.status).toBe("skip_receipt_mismatch");
    expect(result.memory).toBeNull();
  });

  it("rejects activity-shaped learning from ordinary social observations", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation({ kind: "direct_interaction", activity: undefined }),
      receipt: receipt(),
    });
    expect(result.status).toBe("skip_not_activity");
  });

  it("requires a persisted observation id", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation({ id: undefined }),
      receipt: receipt(),
    });
    expect(result.status).toBe("skip_unpersisted");
  });

  it("requires exact Kaira instance ownership", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation({ kairaInstanceId: "kaira_b" }),
      receipt: receipt(),
    });
    expect(result.status).toBe("skip_owner_mismatch");
  });

  it("requires grounded world truth", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation({ status: "ambiguous" }),
      receipt: receipt(),
    });
    expect(result.status).toBe("skip_not_grounded");
  });

  it("requires canonical activity completion and a trusted outcome receipt", () => {
    const active = observation({
      activity: {
        activityId: "theatre_01",
        activityType: "theatre",
        status: "active",
        experienceSubject: {
          preferenceKey: "preferred_performance_type",
          experiencedValue: "theatre",
        },
      },
    });
    expect(projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: active,
      receipt: receipt({ status: "active" }),
    }).status).toBe("skip_not_completed");
    expect(projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation(),
    }).status).toBe("skip_missing_receipt");
  });

  it("fails closed for ephemeral Welcome Kaira even when receipt is otherwise valid", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: { instanceId: "welcome_1", instanceType: "welcome" },
      observation: observation({ kairaInstanceId: "welcome_1" }),
      receipt: receipt({ kairaInstanceId: "welcome_1" }),
    });
    expect(result.status).toBe("skip_ephemeral_instance");
    expect(result.memory).toBeNull();
  });

  it("rejects out-of-range outcome values instead of clamping evidence into validity", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: individual,
      observation: observation(),
      receipt: receipt({
        outcome: {
          outcomeValence: 4,
          appraisalConfidence: 0.9,
          attributionConfidence: 0.9,
        },
      }),
    });
    expect(result.status).toBe("skip_invalid_outcome");
    expect(result.memory).toBeNull();
  });
});
