import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bridge = readFileSync("src/services/serverLanguageUnderstanding.ts", "utf8");

describe("server language-understanding provider boundary contracts", () => {
  it("keeps canonical semantic evidence transport-provider neutral", () => {
    expect(bridge).toContain('name: "llm_semantic_runtime"');
    expect(bridge).not.toContain('name: `llm_semantic_${input.preferredProvider}`');
  });

  it("uses preferredProvider only for transport selection", () => {
    expect(bridge).toContain(
      "input.generateText(system, [{ role: \"user\", content: prompt }], temperature, input.preferredProvider)",
    );
  });
});
