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

  it("freezes current_user as the canonical first-person subject and never aliases it to kaira", () => {
    expect(bridge).toContain("Kullanıcının birinci şahıs");
    expect(bridge).toContain("current_user");
    expect(bridge).toContain("Kaira için kaira yalnız");
  });

  it("keeps nested reported speech out of durable world-memory facts when direct provenance is unavailable", () => {
    expect(bridge).toContain("NESTED REPORTED SPEECH");
    expect(bridge).toContain("worldMemory claim ÜRETME");
    expect(bridge).toContain("propositions/evidence");
    expect(bridge).toContain("belirsizliği koru");
  });
});