import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");

function count(source: string, needle: string) {
  return source.split(needle).length - 1;
}

describe("Kaira response rhythm server integration", () => {
  it("imports the canonical response rhythm detector", () => {
    expect(server).toContain(
      'import { findKairoResponseRhythmIssues } from "./src/services/kairoResponseRhythm";',
    );
  });

  it("checks repetition across draft, repair, fallback and guarded response seams", () => {
    expect(count(server, "findKairoResponseRhythmIssues(")).toBeGreaterThanOrEqual(5);
    expect(server).toContain("findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move)");
    expect(server).toContain("findKairoResponseRhythmIssues(repairedReply, cleanHistory, dialogueDecision.move)");
    expect(server).toContain("findKairoResponseRhythmIssues(fallback, cleanHistory, dialogueDecision.move)");
    expect(server).toContain("findKairoResponseRhythmIssues(planSafeFallback, cleanHistory, dialogueDecision.move)");
  });

  it("passes the canonical dialogue move so factual and recall paths are not rhythm-policed", () => {
    expect(count(server, "cleanHistory, dialogueDecision.move)")).toBeGreaterThanOrEqual(5);
  });
});
