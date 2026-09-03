import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

const ROLLOUT_FLAGS = [
  "SEMANTIC_SCHEMA_V2",
  "RELATIONSHIP_REDUCER_V2",
  "PLAN_RESOLVER_V2",
  "CANONICAL_PROMPT_BUILDER",
  "UNIFIED_GUARD_PASS",
] as const;

const AUTHORITATIVE_RUNTIME_FILES = [
  "server.ts",
  "src/services/kdmConsistencyEngine.ts",
  "src/services/kairaResponsePlan.ts",
];

describe("PR5 canonical authority promotion regression", () => {
  it("contains no runtime rollout-flag decision branch in authoritative files", () => {
    for (const path of AUTHORITATIVE_RUNTIME_FILES) {
      const text = source(path);
      expect(text, path).not.toContain("isCanonicalBehaviorFlagEnabled");
      for (const flag of ROLLOUT_FLAGS) expect(text, `${path}:${flag}`).not.toContain(flag);
    }
  });

  it("retire the temporary rollout flag registry itself", () => {
    expect(existsSync("src/config/canonicalBehaviorFlags.ts")).toBe(false);
  });

  it("keeps the canonical authorities explicit after compatibility removal", () => {
    expect(source("src/services/kdmConsistencyEngine.ts")).toContain(
      "return analyzeKdmInteractionCanonical({",
    );
    expect(source("src/services/kairaResponsePlan.ts")).toContain(
      "const resolved = resolveKairaResponsePlan({ hard, soft, dialogue, speech, contract });",
    );
    expect(source("server.ts")).toContain("buildCanonicalBehaviorBlock(responsePlan)");
    expect(source("server.ts")).toContain("runKairaResponseConstraintPass({");
  });
});
