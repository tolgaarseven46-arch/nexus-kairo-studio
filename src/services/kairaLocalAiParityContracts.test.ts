import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const persistence = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"),
  "utf8",
);
const unifiedPass = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/kairaResponseConstraintPass.ts"),
  "utf8",
);

function count(source: string, needle: string) {
  return source.split(needle).length - 1;
}

describe("KAIRA local-language / AI parity contracts", () => {
  it("runs the same deterministic world-memory authority on both response paths", () => {
    // Both paths either consume the canonical unified pass result or fall back to
    // the same legacy world guard during rollout. This proves parity without
    // freezing the implementation to pre-unification local variable syntax.
    expect(count(server, "canonicalConstraint?.worldGuard ?? enforceWorldModelRecallResponse(")).toBeGreaterThanOrEqual(2);
    expect(unifiedPass).toContain("enforceWorldModelRecallResponse(");
  });

  it("persists appraisal, policy and guard metadata from both paths", () => {
    expect(count(server, "worldStateAppraisal,")).toBeGreaterThanOrEqual(4);
    expect(count(server, "worldReasoningPolicy,")).toBeGreaterThanOrEqual(4);
    expect(count(server, "worldMemoryGuard,")).toBeGreaterThanOrEqual(4);

    expect(persistence).toContain(
      "worldStateAppraisal: payload.metadata?.worldStateAppraisal",
    );
    expect(persistence).toContain(
      "worldReasoningPolicy: payload.metadata?.worldReasoningPolicy",
    );
    expect(persistence).toContain(
      "worldMemoryGuard: payload.metadata?.worldMemoryGuard",
    );
  });

  it("returns the same world reasoning observability envelope to clients", () => {
    const localResponse = server.indexOf('providerUsed: "local_language"');
    const aiResponse = server.lastIndexOf("providerUsed: activeAiProviderUsed");

    expect(localResponse).toBeGreaterThan(0);
    expect(aiResponse).toBeGreaterThan(localResponse);

    const localWindow = server.slice(localResponse, localResponse + 5000);
    const aiWindow = server.slice(aiResponse, aiResponse + 5000);

    for (const field of [
      "worldStateAppraisal",
      "worldReasoningPolicy",
      "worldMemoryGuard",
    ]) {
      expect(localWindow).toContain(field);
      expect(aiWindow).toContain(field);
    }
  });

  it("keeps guard outcome visible in enforcement reasons on both paths", () => {
    expect(count(server, "worldMemoryGuard.reason")).toBeGreaterThanOrEqual(2);
    expect(count(server, "worldMemoryGuard.changed")).toBeGreaterThanOrEqual(2);
  });
});
