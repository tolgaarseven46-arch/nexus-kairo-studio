import { describe, expect, it } from "vitest";
import {
  experiencePreferenceAppraisalFromActivityReceipt,
  type KairaActivityExecutionReceipt,
} from "./kairaActivityExperienceReceipt";
import { preferenceEvidenceFromExperienceAppraisal } from "./kairaExperiencePreferenceAppraisal";

const receipt = (
  overrides: Partial<KairaActivityExecutionReceipt> = {},
): KairaActivityExecutionReceipt => ({
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

describe("Kaira activity experience receipt contracts", () => {
  it("turns a trusted completed Kaira-owned activity receipt into direct experience appraisal", () => {
    const decision = experiencePreferenceAppraisalFromActivityReceipt(individual, receipt());
    expect(decision.status).toBe("appraisal");
    if (decision.status !== "appraisal") throw new Error("expected appraisal");
    expect(decision.appraisal).toMatchObject({
      experienceId: "activity:theatre_01",
      sourceWorldObservationId: "obs_activity_01",
      ownership: "kaira_direct",
      completion: "completed",
      preferenceKey: "preferred_performance_type",
      experiencedValue: "theatre",
    });
    expect(preferenceEvidenceFromExperienceAppraisal(decision.appraisal).status).toBe("evidence");
  });

  it("rejects a receipt owned by another Kaira instance", () => {
    expect(experiencePreferenceAppraisalFromActivityReceipt(
      individual,
      receipt({ kairaInstanceId: "kaira_b" }),
    )).toEqual({ status: "rejected", appraisal: null, reason: "instance_mismatch" });
  });

  it("does not create persistent lived experience for Welcome Kaira", () => {
    expect(experiencePreferenceAppraisalFromActivityReceipt(
      { instanceId: "welcome_1", instanceType: "welcome" },
      receipt({ kairaInstanceId: "welcome_1" }),
    )).toEqual({ status: "rejected", appraisal: null, reason: "ephemeral_instance" });
  });

  it.each(["planned", "active", "cancelled", "failed"] as const)(
    "rejects %s activity because execution did not complete",
    (status) => {
      expect(experiencePreferenceAppraisalFromActivityReceipt(
        individual,
        receipt({ status }),
      )).toEqual({ status: "rejected", appraisal: null, reason: "not_completed" });
    },
  );

  it("requires an explicit preference probe instead of inferring preference from activity identity", () => {
    expect(experiencePreferenceAppraisalFromActivityReceipt(
      individual,
      receipt({ preferenceProbe: undefined }),
    )).toEqual({ status: "rejected", appraisal: null, reason: "missing_preference_probe" });
  });

  it("requires an explicit Kaira-owned outcome instead of treating completion as enjoyment", () => {
    expect(experiencePreferenceAppraisalFromActivityReceipt(
      individual,
      receipt({ outcome: undefined }),
    )).toEqual({ status: "rejected", appraisal: null, reason: "missing_outcome" });
  });

  it("keeps reported world-event lifecycle outside the trusted activity authority", () => {
    const fake = receipt({ authority: "user_report" as never });
    expect(experiencePreferenceAppraisalFromActivityReceipt(individual, fake))
      .toEqual({ status: "rejected", appraisal: null, reason: "invalid_receipt" });
  });
});
