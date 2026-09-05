import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { findKairaSelfCorrectionAccountabilityIssues } from "./kairaSelfCorrectionAccountability";

const correctionPlan = {
  requiredContent: ["own_previous_correction", "no_counter_flirt"],
} as KairaResponsePlan;

const ordinaryPlan = {
  requiredContent: ["no_counter_flirt"],
} as KairaResponsePlan;

describe("Kaira own-previous-correction accountability", () => {
  it("rejects defensive denial when the canonical plan requires owning Kaira's correction", () => {
    expect(
      findKairaSelfCorrectionAccountabilityIssues(
        "hayır ben doğru söyledim, sen yanlış anladın",
        correctionPlan,
      ),
    ).toContain("self_correction_accountability_deflected");
  });

  it("rejects generic acknowledgement that does not own the correction", () => {
    expect(findKairaSelfCorrectionAccountabilityIssues("tamam", correctionPlan)).toContain(
      "self_correction_accountability_missing",
    );
  });

  it("accepts concise ownership/apology surfaces without forcing one exact wording", () => {
    for (const reply of [
      "he doğru",
      "haklısın, yanlış söyledim",
      "evet karıştırmışım",
      "pardon, öyle değilmiş",
    ]) {
      expect(findKairaSelfCorrectionAccountabilityIssues(reply, correctionPlan)).toEqual([]);
    }
  });

  it("does not manufacture accountability obligations on unrelated turns", () => {
    expect(
      findKairaSelfCorrectionAccountabilityIssues(
        "hayır ben doğru söyledim",
        ordinaryPlan,
      ),
    ).toEqual([]);
  });

  it("locks plan ownership and final-delivery consumption of the obligation", () => {
    const resolver = readFileSync(new URL("./kairaPlanResolver.ts", import.meta.url), "utf8");
    const pass = readFileSync(new URL("./kairaResponseConstraintPass.ts", import.meta.url), "utf8");
    expect(resolver).toContain('dialogue.move === "acknowledge_correction"');
    expect(resolver).toContain('requiredContent.push("own_previous_correction")');
    expect(pass).toContain("findKairaSelfCorrectionAccountabilityIssues(delivered, input.plan)");
  });
});
