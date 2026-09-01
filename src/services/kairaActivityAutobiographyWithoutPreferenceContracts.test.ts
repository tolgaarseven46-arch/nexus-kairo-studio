import { describe, expect, it } from "vitest";
import { projectKairaActivityObservationToAutobiography } from "./kairaActivityAutobiographicalProjection";
import type { WorldEventObservation } from "./worldModelEventStore";

const observation: WorldEventObservation = {
  id: "obs_walk_01",
  userId: "system_activity",
  kairaInstanceId: "kaira_a",
  sessionId: "activity_session",
  kind: "kaira_activity",
  status: "grounded",
  createdAt: "2026-09-01T12:00:00.000Z",
  event: {
    raw: "kaira_activity:walk:completed",
    eventType: "general",
    reportedSpeech: false,
    certainty: 1,
    ambiguities: [],
    evidence: ["authority:kaira_activity_executor"],
  },
  activity: {
    activityId: "walk_01",
    activityType: "walk",
    status: "completed",
  },
};

const receipt = {
  authority: "kaira_activity_executor" as const,
  activityId: "walk_01",
  kairaInstanceId: "kaira_a",
  sourceWorldObservationId: "obs_walk_01",
  status: "completed" as const,
  outcome: {
    outcomeValence: 0.78,
    appraisalConfidence: 0.9,
    attributionConfidence: 0.88,
  },
};

describe("Kaira activity autobiography without preference learning", () => {
  it("remembers a salient completed activity even when no preference subject exists", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation,
      receipt,
    });
    expect(result.status).toBe("projected");
    expect(result.preferenceEvidenceStatus).toBeUndefined();
    expect(result.preferenceEvidenceReason).toBeUndefined();
    expect(result.memory).toMatchObject({
      id: "lived_obs_walk_01",
      eventType: "activity:walk",
      sourceWorldObservationIds: ["obs_walk_01"],
    });
    expect(result.memory?.selfRevisionEvidence).toBeUndefined();
  });

  it("still requires a trusted bounded outcome when no preference subject exists", () => {
    const result = projectKairaActivityObservationToAutobiography({
      instance: { instanceId: "kaira_a", instanceType: "individual" },
      observation,
      receipt: {
        ...receipt,
        outcome: {
          outcomeValence: Number.NaN,
          appraisalConfidence: 0.9,
          attributionConfidence: 0.88,
        },
      },
    });
    expect(result.status).toBe("skip_invalid_outcome");
    expect(result.memory).toBeNull();
  });
});
