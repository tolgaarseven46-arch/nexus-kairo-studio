import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");

describe("KAIRA per-turn observability completeness contracts", () => {
  it("persists before/after state and reasoning per turn instead of reconstructing from final session state", () => {
    expect(server).toContain("dynamicStateBefore: requestState");
    expect(server).toContain("dynamicStateAfter: kdm.nextDynamicState");
    expect(server).toContain("reasoningTrace: kdm.trace");

    expect(persistence).toContain("dynamicStateBefore: payload.dynamicStateBefore");
    expect(persistence).toContain("dynamicStateAfter: payload.dynamicStateAfter");
    expect(persistence).toContain("reasoningTrace: payload.reasoningTrace");
    expect(persistence).toContain("dynamicStateBefore: normalizeDynamicState(data.dynamicStateBefore) || undefined");
    expect(persistence).toContain("dynamicStateAfter: normalizeDynamicState(data.dynamicStateAfter) || undefined");
  });

  it("persists the complete world reasoning trace on each turn", () => {
    expect(server.match(/worldStateAppraisal,/g)?.length).toBeGreaterThanOrEqual(2);
    expect(server.match(/worldReasoningPolicy,/g)?.length).toBeGreaterThanOrEqual(2);
    expect(server.match(/worldMemoryGuard,/g)?.length).toBeGreaterThanOrEqual(2);

    expect(persistence).toContain("worldStateAppraisal: payload.metadata?.worldStateAppraisal");
    expect(persistence).toContain("worldReasoningPolicy: payload.metadata?.worldReasoningPolicy");
    expect(persistence).toContain("worldMemoryGuard: payload.metadata?.worldMemoryGuard");
  });

  it("restores world reasoning observability from the actual last turn metadata", () => {
    expect(persistence).toContain("lastWorldStateAppraisal: lastTurn?.metadata?.worldStateAppraisal");
    expect(persistence).toContain("lastWorldReasoningPolicy: lastTurn?.metadata?.worldReasoningPolicy");
    expect(persistence).toContain("lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard");
  });

  it("keeps provider and timing provenance on every saved turn", () => {
    expect(server).toContain("providerUsed: \"local_language\"");
    expect(server).toContain("providerUsed: activeAiProviderUsed");
    expect(server).toContain("timings: { memoryMs, kdmMs, aiMs: 0 }");
    expect(server).toContain("timings: { memoryMs, kdmMs, aiMs }");

    expect(persistence).toContain("providerUsed: payload.metadata?.providerUsed");
    expect(persistence).toContain("timings: payload.metadata?.timings");
  });

  it("keeps retrieved world evidence beside appraisal, policy and guard for auditability", () => {
    expect(server.match(/retrievedWorldEvents: retrievedWorldEvents\.map/g)?.length).toBeGreaterThanOrEqual(2);
    expect(persistence).toContain("retrievedWorldEvents: payload.metadata?.retrievedWorldEvents");
    expect(persistence).toContain("retrievedWorldEvents?: unknown");
  });
});
