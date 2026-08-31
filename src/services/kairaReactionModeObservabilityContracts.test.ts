import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("reaction-mode observability contracts", () => {
  it("keeps the canonical reaction mode in persisted dynamic-state snapshots", async () => {
    const server = await readFile("server.ts", "utf8");
    expect(server).toContain("dynamicStateAfter: kdm.nextDynamicState");
  });

  it("projects backend reaction mode into the TestLab diagnostic snapshot", async () => {
    const source = await readFile("src/components/studio/tabs/TestLabTab.tsx", "utf8");
    expect(source).toContain("reactionMode: serverState.reactionMode || serverTrace?.currentMood?.reactionMode || 'neutral'");
  });

  it("shows the qualitative reaction explicitly in the TestLab current-state debug card", async () => {
    const source = await readFile("src/components/studio/tabs/TestLabTab.tsx", "utf8");
    expect(source).toContain("Tepki: {lastAnalysis.emotionAfter.reactionMode}");
    expect(source).toContain("reactionMode?: string");
  });
});
