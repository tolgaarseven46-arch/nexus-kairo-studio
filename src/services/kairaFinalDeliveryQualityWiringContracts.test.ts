import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const serverSource = readFileSync("server.ts", "utf8");

describe("Kaira final-delivery quality wiring contracts", () => {
  it("feeds the existing lower-authority delivery checks into the canonical constraint pass before fallback selection", () => {
    const canonicalCall = serverSource.match(
      /runKairaResponseConstraintPass\(\{[\s\S]*?fallbackFactory:\s*\(\)\s*=>[\s\S]*?buildGroundedDialogueFallback\([\s\S]*?\),\s*\}\);/u,
    )?.[0];

    expect(canonicalCall).toBeTruthy();
    expect(canonicalCall).toContain("additionalIssueFinder");
    expect(canonicalCall).toContain("findKairoGroundingIssues(candidateReply");
    expect(canonicalCall).toContain("findDialogueAttributionIssues(candidateReply");
    expect(canonicalCall).toContain("findDialogueDecisionIssues(candidateReply");
    expect(canonicalCall).toContain("findKairoResponseRhythmIssues(candidateReply");
  });
});
