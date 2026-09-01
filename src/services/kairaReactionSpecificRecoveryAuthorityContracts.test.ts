import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("reaction-specific recovery authority", () => {
  it("keeps temperament as rate math and relationship recovery as qualitative authority", () => {
    const temperament = readFileSync("src/services/temperamentEngine.ts", "utf8");
    const recovery = readFileSync("src/services/relationshipConditionedRecovery.ts", "utf8");
    const kdm = readFileSync("src/services/kdmConsistencyEngine.ts", "utf8");
    expect(temperament).toContain("temperamentRecoveryFactor");
    expect(recovery).toContain("recoverRelationshipConditionedState");
    expect(recovery).toContain('reaction === "irritated"');
    expect(recovery).toContain('reaction === "hurt"');
    expect(recovery).toContain('reaction === "withdrawn"');
    expect(recovery).toContain('reaction === "repairing"');
    expect(kdm).toContain("preTurnRecovery = recoverRelationshipConditionedState({");
    expect(kdm).toContain("reactionMode: preTurnRecovery.reactionMode");
  });
});
