import { describe, expect, it } from "vitest";
import {
  canEnterSliceBW3,
  validateSliceBW2ReviewIntake,
} from "./sliceBW2ReviewIntake";

const validReview = {
  reviewer: {
    name: "Independent Reviewer",
    independent: true,
    reviewedAt: "2026-09-18T09:45:00+03:00",
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
} as const;

describe("Slice B W2 review intake", () => {
  it("accepts a complete independent review envelope structurally", () => {
    expect(validateSliceBW2ReviewIntake(validReview)).toBe(true);
  });

  it("does not let a self-attested payload open W3 without trusted external provenance", () => {
    expect(canEnterSliceBW3(validReview as any)).toBe(false);
  });

  it("rejects self-review pretending to be independent", () => {
    expect(
      validateSliceBW2ReviewIntake({
        ...validReview,
        reviewer: { ...validReview.reviewer, independent: false },
      }),
    ).toBe(false);
  });

  it("rejects incomplete blocker findings", () => {
    expect(
      validateSliceBW2ReviewIntake({
        ...validReview,
        blockers: [{ id: "B1", counterexample: "x" }],
      }),
    ).toBe(false);
  });

  it("keeps W3 closed while any blocker remains", () => {
    const review = {
      ...validReview,
      blockers: [
        {
          id: "B1",
          counterexample: "counterexample",
          violatedInvariant: "authority boundary",
          minimumRepair: "repair",
          requiredTest: "test",
        },
      ],
      verdicts: {
        ...validReview.verdicts,
        shadowSemanticAuthorityBlockerRemains: true,
        safeToEnterW3AfterRepairs: false,
      },
    };
    expect(validateSliceBW2ReviewIntake(review)).toBe(true);
    expect(canEnterSliceBW3(review as any)).toBe(false);
  });
});
