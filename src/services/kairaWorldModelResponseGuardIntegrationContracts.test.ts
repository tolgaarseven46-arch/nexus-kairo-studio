import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");
const guard = fs.readFileSync(path.resolve(process.cwd(), "src/services/worldModelResponseGuard.ts"), "utf8");
const unifiedPass = fs.readFileSync(path.resolve(process.cwd(), "src/services/kairaResponseConstraintPass.ts"), "utf8");

describe("world-model response guard runtime integration contract", () => {
  it("wires grounded-memory issues into legacy repair/fallback and canonical final delivery", () => {
    expect(server).toContain('from "./src/services/worldModelResponseGuard"');
    expect(server).toContain('from "./src/services/kairaResponseConstraintPass"');
    expect(server).toContain("findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext)");
    expect(server).toContain("findWorldModelResponseIssues(fallback, retrievedWorldEvents, worldReasoningContext)");
    expect(unifiedPass).toContain("findWorldModelResponseIssues(delivered, input.worldItems, input.worldContext)");
  });

  it("guards local-language early returns on both rollout paths", () => {
    expect(server).toContain("canonicalConstraint?.worldGuard ?? enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext)");
    expect(server).toContain("runKairaResponseConstraintPass({");
    expect(server).toContain("reply: local.reply");
  });

  it("shares one canonical appraisal/policy/query authority with deterministic enforcement", () => {
    expect(server).toContain("const worldReasoningContext = {");
    expect(server).toContain("appraisal: worldStateAppraisal");
    expect(server).toContain("policy: worldReasoningPolicy");
    expect(server).toContain("memoryQuery: canonicalSemantic.interpretation.worldMemory?.query ?? null");
    expect(server).toContain("findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext)");
    expect(server).toContain("worldContext: worldReasoningContext");
    expect(guard).toContain("context: WorldModelReasoningContext");
    expect(guard).not.toContain("appraiseRetrievedWorldState(");
    expect(guard).not.toContain("deriveWorldReasoningPolicy(");
  });

  it("persists world reasoning observability fields", () => {
    expect(persistence).toContain("worldStateAppraisal: payload.metadata?.worldStateAppraisal");
    expect(persistence).toContain("worldReasoningPolicy: payload.metadata?.worldReasoningPolicy");
    expect(persistence).toContain("worldMemoryGuard: payload.metadata?.worldMemoryGuard");
  });

  it("runs deterministic world truth before autobiographical, epistemic and plan enforcement", () => {
    const worldIndex = unifiedPass.indexOf("enforceWorldModelRecallResponse(");
    const selfMemoryIndex = unifiedPass.indexOf("enforceKairaAutobiographicalResponse(");
    const epistemicIndex = unifiedPass.indexOf("enforceKairaEpistemicResponse(");
    const planIndex = unifiedPass.indexOf("enforceKairoResponse(");

    expect(worldIndex).toBeGreaterThan(-1);
    expect(selfMemoryIndex).toBeGreaterThan(worldIndex);
    expect(epistemicIndex).toBeGreaterThan(selfMemoryIndex);
    expect(planIndex).toBeGreaterThan(epistemicIndex);
    expect(unifiedPass).toContain("worldGuard.reason");
  });
});
