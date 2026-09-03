import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("Kaira unified guard canonical wiring", () => {
  it("invokes the same canonical constraint pass on local and model paths", () => { const source=readFileSync("server.ts","utf8"); expect(source).not.toContain("isCanonicalBehaviorFlagEnabled"); expect(source.match(/runKairaResponseConstraintPass\(\{/g)?.length ?? 0).toBeGreaterThanOrEqual(2); });
  it("keeps truth ordering and fallback revalidation inside the reusable pass", () => { const source=readFileSync("src/services/kairaResponseConstraintPass.ts","utf8"); const world=source.indexOf("enforceWorldModelRecallResponse("); const self=source.indexOf("enforceKairaAutobiographicalResponse("); const epi=source.indexOf("enforceKairaEpistemicResponse("); const plan=source.indexOf("enforceKairoResponse("); const conform=source.indexOf("findKairaResponsePlanIssues(delivered, input.plan)"); expect(world).toBeGreaterThan(-1); expect(world).toBeLessThan(self); expect(self).toBeLessThan(epi); expect(epi).toBeLessThan(plan); expect(plan).toBeLessThan(conform); expect(source).toContain('runOrderedPass("tamam", input)'); });
});
