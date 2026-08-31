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

  it("keeps the repair helper scoped to the qualitative reaction check", async () => {
    const source = await readFile("src/services/kairoResponseConsistency.ts", "utf8");

    expect(source).toContain("export function findKairoAffectiveResponseIssues");
    expect(source).toContain("return result.checks.qualitativeReactionTone ? [] : [QUALITATIVE_REACTION_RESPONSE_ISSUE]");
  });
});
