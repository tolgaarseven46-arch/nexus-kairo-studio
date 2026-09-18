import { describe, expect, it } from "vitest";
import { buildSliceBW2ToW3TransitionPlan } from "./sliceBW2ToW3TransitionPlanner";
import type { SliceBW2ReviewIntake } from "./sliceBW2ReviewIntake";

const cleanReview: SliceBW2ReviewIntake = {
  reviewer: {
    name: "Independent Reviewer",
    independent: true,
    reviewedAt: "2026-09-18T10:00:00+03:00",
  },
  blockers: [],
  nonBlockers: [],
  future: [],
  verdicts: {
    shadowSemanticAuthorityBlockerRemains: false,
    hiddenEngagementAuthorityBlockerRemains: false,
    isolationBlockerRemains: false,
    replayPurityBlockerRemains: false,
    determinismBlockerRemains: false,
    privacyBlockerRemains: false,
    safeToEnterW3AfterRepairs: true,
  },
};

describe("Slice B W2 → W3 transition planner", () => {
  it("opens W3 only for a clean accepted review", () => {
    const plan = buildSliceBW2ToW3TransitionPlan(cleanReview);
    expect(plan.canFreezeW3).toBe(true);
    expect(plan.unresolvedBlockerIds).toEqual([]);
    expect(plan.requiredRepairs).toEqual([]);
    expect(plan.freezeChecklist).toHaveLength(7);
  });

  it("turns reviewer blockers into explicit repair + test work", () => {
    const review: SliceBW2ReviewIntake = {
      ...cleanReview,
      blockers: [
        {
          id: "B-W2-01",
          counterexample: "conflicting duplicate event ids diverge silently",
          violatedInvariant: "deterministic idempotency",
          minimumRepair: "define conflict rejection contract",
          requiredTest: "duplicate-conflicting fixture rejects deterministically",
        },
      ],
      verdicts: {
        ...cleanReview.verdicts,
        determinismBlockerRemains: true,
        safeToEnterW3AfterRepairs: false,
      },
    };

    expect(buildSliceBW2ToW3TransitionPlan(review)).toMatchObject({
      canFreezeW3: false,
      unresolvedBlockerIds: ["B-W2-01"],
      requiredRepairs: [
        {
          blockerId: "B-W2-01",
          minimumRepair: "define conflict rejection contract",
          requiredTest: "duplicate-conflicting fixture rejects deterministically",
        },
      ],
    });
  });

  it("does not convert non-blockers or future findings into W3 blockers", () => {
    const review: SliceBW2ReviewIntake = {
      ...cleanReview,
      nonBlockers: [
        {
          id: "NB-1",
          rationale: "naming cleanup only",
          recommendedCleanupOrTest: "rename field in W3 draft",
        },
      ],
      future: [
        {
          id: "F-1",
          whyOutOfScope: "requires simultaneous engagement authority R",
        },
      ],
    };

    const plan = buildSliceBW2ToW3TransitionPlan(review);
    expect(plan.canFreezeW3).toBe(true);
    expect(plan.unresolvedBlockerIds).toEqual([]);
  });
});
