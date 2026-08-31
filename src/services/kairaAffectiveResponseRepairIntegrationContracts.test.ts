import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("qualitative reaction repair integration", () => {
  it("routes qualitative reaction HOW issues into the pre-delivery AI repair list", async () => {
    const server = await readFile("server.ts", "utf8");
    const calls = server.match(/findKairoAffectiveResponseIssues\(reply, kdm\.trace\)/g) ?? [];

    expect(server).toContain("findKairoAffectiveResponseIssues,");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(server.indexOf("findKairoAffectiveResponseIssues(reply, kdm.trace)")).toBeLessThan(
      server.indexOf("let repairAttempts = 0"),
    );
  });

  it("revalidates repaired and grounded fallback candidates against the same qualitative HOW rule", async () => {
    const server = await readFile("server.ts", "utf8");

    expect(server).toContain("findKairoAffectiveResponseIssues(repairedReply, kdm.trace)");
    expect(server).toContain("findKairoAffectiveResponseIssues(fallback, kdm.trace)");
  });

  it("keeps the repair helper scoped to the qualitative reaction check", async () => {
    const source = await readFile("src/services/kairoResponseConsistency.ts", "utf8");

    expect(source).toContain("export function findKairoAffectiveResponseIssues");
    expect(source).toContain("return result.checks.qualitativeReactionTone ? [] : [QUALITATIVE_REACTION_RESPONSE_ISSUE]");
  });

  it("keeps a final deterministic HOW sanitizer as the last protection when model repair cannot resolve the issue", async () => {
    const source = await readFile("src/services/kairoResponseConsistency.ts", "utf8");

    expect(source).toContain("function enforceQualitativeReactionHow");
    expect(source).toContain("qualitative_reaction_how_enforced");
    expect(source).toContain("affectiveFallbackForTrace");
  });
});
