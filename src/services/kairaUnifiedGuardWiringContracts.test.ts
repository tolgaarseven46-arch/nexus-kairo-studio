import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const server = () => readFileSync("server.ts", "utf8");
const constraintPass = () => readFileSync("src/services/kairaResponseConstraintPass.ts", "utf8");

describe("Kaira unified guard runtime wiring contracts", () => {
  it("gates the canonical final-delivery pass behind ADR-0006 UNIFIED_GUARD_PASS", () => {
    const source = server();
    expect(source).toContain('import { runKairaResponseConstraintPass } from "./src/services/kairaResponseConstraintPass"');
    expect(source).toContain('unifiedGuardOn = isCanonicalBehaviorFlagEnabled("UNIFIED_GUARD_PASS")');
    expect(source.match(/runKairaResponseConstraintPass\(\{/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).toContain('canonicalConstraint?.consistency ?? validateKairoResponse');
  });

  it("covers both local and model-generated delivery paths without deleting the flag-off legacy rollback", () => {
    const source = server();
    const localStart = source.indexOf("if (!selfMemoryInstruction && local.handled && local.reply)");
    const aiStart = source.indexOf("const canonicalConstraint = unifiedGuardOn", localStart + 1);
    expect(localStart).toBeGreaterThan(-1);
    expect(source.indexOf("runKairaResponseConstraintPass({", localStart)).toBeLessThan(aiStart);
    expect(aiStart).toBeGreaterThan(localStart);
    expect(source).toContain(': enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract)');
    expect(source).toContain('if (!canonicalConstraint && postEnforcementPlanIssues.length)');
  });

  it("keeps truth ordering and fallback revalidation inside one reusable canonical pass", () => {
    const source = constraintPass();
    const world = source.indexOf("enforceWorldModelRecallResponse(");
    const selfMemory = source.indexOf("enforceKairaAutobiographicalResponse(");
    const epistemic = source.indexOf("enforceKairaEpistemicResponse(");
    const plan = source.indexOf("enforceKairoResponse(");
    const conformance = source.indexOf("findKairaResponsePlanIssues(delivered, input.plan)");
    expect(world).toBeGreaterThan(-1);
    expect(world).toBeLessThan(selfMemory);
    expect(selfMemory).toBeLessThan(epistemic);
    expect(epistemic).toBeLessThan(plan);
    expect(plan).toBeLessThan(conformance);
    expect(source).toContain("const candidate = runOrderedPass(preferredFallback, input)");
    expect(source).toContain('runOrderedPass("tamam", input)');
  });
});
