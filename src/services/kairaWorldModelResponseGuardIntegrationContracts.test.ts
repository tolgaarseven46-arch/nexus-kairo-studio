import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");

describe("world-model response guard runtime integration contract", () => {
  it("wires grounded-memory issues into initial, repair and fallback validation", () => {
    expect(server).toContain('from "./src/services/worldModelResponseGuard"');
    expect(server.match(/findWorldModelResponseIssues\(/g)?.length).toBeGreaterThanOrEqual(4);
    expect(server).toContain("findWorldModelResponseIssues(repairedReply, retrievedWorldEvents)");
    expect(server).toContain("findWorldModelResponseIssues(fallback, retrievedWorldEvents)");
  });

  it("guards local-language early returns too", () => {
    expect(server).toContain("const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents)");
  });

  it("persists world reasoning observability fields", () => {
    expect(persistence).toContain("worldStateAppraisal: payload.metadata?.worldStateAppraisal");
    expect(persistence).toContain("worldReasoningPolicy: payload.metadata?.worldReasoningPolicy");
    expect(persistence).toContain("worldMemoryGuard: payload.metadata?.worldMemoryGuard");
  });

  it("runs deterministic recall enforcement before behavior enforcement", () => {
    const guardIndex = server.indexOf("enforceWorldModelRecallResponse(reply, retrievedWorldEvents)");
    const behaviorIndex = server.indexOf("enforceKairoResponse(reply, kdm.trace, enforcementRules)", guardIndex);

    expect(guardIndex).toBeGreaterThan(0);
    expect(behaviorIndex).toBeGreaterThan(guardIndex);
    expect(server).toContain("worldMemoryGuard.reason");
  });
});
