import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Kaira Turn 25 runtime generated-claim verification wiring", () => {
  const server = readFileSync("server.ts", "utf8");

  it("routes generated replies through canonical semantic verification before final constraint delivery", () => {
    expect(server).toContain(
      'import { resolveGeneratedReplySemanticVerification } from "./src/services/kairaGeneratedReplySemanticVerification";',
    );
    expect(server).toContain(
      "await resolveGeneratedReplySemanticVerification({",
    );
    expect(server).toContain("replySemanticInterpretation,");
    expect(server).toContain("claimEvidenceInterpretations,");
  });

  it("uses canonical current/history semantic snapshots as provenance evidence", () => {
    expect(server).toContain("canonicalSemantic.interpretation");
    expect(server).toContain("turn.semanticInterpretation");
  });

  it("does not retry a failed generation provider only to verify its deterministic fallback", () => {
    expect(server).toContain("const replySemanticInterpretation = providerFailureFallbackUsed");
    expect(server).toContain("? null");
  });
});
