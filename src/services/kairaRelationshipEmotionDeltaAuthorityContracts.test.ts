import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("relationship emotion delta canonical authority", () => { it("keeps affect deltas in RelationshipReducer", () => { const r=readFileSync("src/services/relationshipReducer.ts","utf8"); expect(r).toContain("const affectDelta: RelationshipAffect"); expect(r).toContain('reactionMode === "irritated"'); expect(r).toContain('reactionMode === "hurt"'); expect(r).toContain('reactionMode === "withdrawn"'); }); });
