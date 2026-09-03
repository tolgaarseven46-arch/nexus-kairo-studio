import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("reaction-specific recovery canonical authority", () => {
  it("keeps scores/FSM recovery reducer-owned while the canonical bridge preserves low-level qualitative continuity", () => {
    const reducer = readFileSync("src/services/relationshipReducer.ts", "utf8");
    const bridge = readFileSync("src/services/kdmRelationshipReducerBridge.ts", "utf8");
    expect(reducer).toContain("computeRecovery(");
    expect(bridge).toContain("projectedReactionMode");
    expect(bridge).toContain("prev.reactionMode");
    expect(bridge).toContain("residual-reaction-persistence");
  });
});
