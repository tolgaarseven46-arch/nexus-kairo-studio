import { describe, expect, it } from "vitest";
import { socialAppraisalHasNoMaterialEffect } from "./socialAppraisal";

describe("SocialAppraisal contract invariants", () => {
  it("treats zero relational + zero affective significance as no material effect", () => {
    expect(socialAppraisalHasNoMaterialEffect({
      relational: { valence: "neutral", significance: 0, harmEvidence: 0, repairEvidence: 0 },
      affective: { valence: "neutral", significance: 0, activation: 0 },
    })).toBe(true);
  });

  it("keeps relational and affective materiality independent", () => {
    expect(socialAppraisalHasNoMaterialEffect({
      relational: { valence: "neutral", significance: 0, harmEvidence: 0, repairEvidence: 0 },
      affective: { valence: "negative", significance: 0.25, activation: 0.4 },
    })).toBe(false);

    expect(socialAppraisalHasNoMaterialEffect({
      relational: { valence: "negative", significance: 0.25, harmEvidence: 0.5, repairEvidence: 0 },
      affective: { valence: "neutral", significance: 0, activation: 0 },
    })).toBe(false);
  });
});
