import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("relationship emotion delta authority contracts", () => {
  it("keeps qualitative emotion deltas owned by relationship appraisal", () => {
    const appraisal = readFileSync("src/services/relationshipConditionedAppraisal.ts", "utf8");
    const kdm = readFileSync("src/services/kdmConsistencyEngine.ts", "utf8");
    expect(appraisal).toContain("emotionDelta:");
    expect(appraisal).toContain('reactionTendency === "irritated"');
    expect(appraisal).toContain('reactionTendency === "hurt"');
    expect(appraisal).toContain('reactionTendency === "withdrawn"');
    expect(appraisal).toContain('reactionTendency === "repairing"');
    expect(kdm).toContain("relationshipAppraisal.emotionDelta");
    expect(kdm).not.toContain('if (kind === "negative" && targetsKaira) {\n    stressDelta');
  });
});
