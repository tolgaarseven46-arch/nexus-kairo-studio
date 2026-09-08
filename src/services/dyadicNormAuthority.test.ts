import { describe, expect, it } from "vitest";
import type { SocialAppraisalInput } from "../types/socialAppraisal";
import type { DyadicSocialNormProfile } from "../types/dyadicSocialNorm";
import { emptyDyadicSocialNorm } from "./dyadicSocialNorm";

describe("dyadic social norm authority", () => {
  it("uses the same canonical profile contract in service and SocialAppraisal input", () => {
    const serviceProfile = emptyDyadicSocialNorm("alice");
    const appraisalProfile: NonNullable<SocialAppraisalInput["dyadicNorm"]> = serviceProfile;
    const canonicalProfile: DyadicSocialNormProfile = appraisalProfile;

    expect(canonicalProfile).toEqual({
      version: 0,
      subjectId: "alice",
      totalObservedTurns: 0,
      evidence: {},
    });
  });
});
