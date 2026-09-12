import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bridge = readFileSync("src/services/serverLanguageUnderstanding.ts", "utf8");

describe("server language-understanding provider boundary contracts", () => {
  it("keeps canonical semantic evidence transport-provider neutral", () => {
    expect(bridge).toContain('const CANONICAL_SEMANTIC_PROVIDER = "llm_semantic_runtime"');
    expect(bridge).toContain("name: CANONICAL_SEMANTIC_PROVIDER");
    expect(bridge).not.toContain('name: `llm_semantic_${input.preferredProvider}`');
  });

  it("uses preferredProvider only for transport selection", () => {
    expect(bridge).toContain("input.generateText(");
    expect(bridge).toContain("input.preferredProvider,");
    expect(bridge).not.toContain("preferredProvider: input.preferredProvider");
  });

  it("overwrites model-supplied LLM provider labels with trusted runtime provenance", () => {
    expect(bridge).toContain('if (result.semanticSource !== "semantic_provider") return result;');
    expect(bridge).toContain("semanticProvider: CANONICAL_SEMANTIC_PROVIDER");
    expect(bridge).toContain('evidence.source === "llm"');
    expect(bridge).toContain("provider: CANONICAL_SEMANTIC_PROVIDER");
  });
});