import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-encounter platform-context latency fast path", () => {
  const source = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");

  it("classifies typed platform scope as first-encounter local fast work", () => {
    expect(source).toContain(
      "canonicalSemantic.interpretation.discourseFacets.platformScopeQuery != null",
    );
  });

  it("uses the fast classification before social appraisal and persistent memory branching", () => {
    const fastClass = source.indexOf(
      "canonicalSemantic.interpretation.discourseFacets.platformScopeQuery != null",
    );
    const socialAppraisal = source.indexOf("const socialAppraisalMemoryRuntime");
    const memoryBranch = source.indexOf("firstEncounterTrivialSocial\n        ? Promise.resolve([])");
    expect(fastClass).toBeGreaterThan(-1);
    expect(socialAppraisal).toBeGreaterThan(fastClass);
    expect(memoryBranch).toBeGreaterThan(fastClass);
  });
});
