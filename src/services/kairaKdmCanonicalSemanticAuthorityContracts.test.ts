import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("KDM canonical SemanticEvent authority", () => {
  it("receives the server canonical event for the live KDM turn", () => {
    const server = source("server.ts");
    expect(server).toMatch(/analyzeKdmInteraction\(\s*userMessage,\s*basePersonality,\s*effective,\s*canonicalSemantic\.event,\s*behaviorPolicy,\s*\)/u);
  });

  it("uses the supplied canonical event and keeps only the central semantic fallback", () => {
    const kdm = source("src/services/kdmConsistencyEngine.ts");
    expect(kdm).toContain("const semanticEvent = canonicalSemanticEvent ?? interpretSemanticEvent(userMessage)");
    expect(kdm).toContain("semanticIntentToKdm(semanticEvent)");
    expect(kdm).toContain("semanticSentimentToKdm(semanticEvent)");
  });

  it("does not carry an independent raw-message intent or sentiment parser", () => {
    const kdm = source("src/services/kdmConsistencyEngine.ts");
    expect(kdm).not.toContain("function classifyIntent(");
    expect(kdm).not.toContain("function classifySentiment(");
    expect(kdm).not.toContain("normalizeKairoLanguageInput");
    expect(kdm).not.toContain("hasLocalLowMoodExpression");
    expect(kdm).not.toContain("isConfusionOrChallenge");
  });
});
