import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("reaction hydration contracts", () => {
  it("keeps affective reaction mode in normalized dynamic state", async () => {
    const source = await readFile("src/services/kdmPersistenceService.ts", "utf8");
    expect(source).toContain("source.reactionMode === 'irritated'");
    expect(source).toContain("source.reactionMode === 'hurt'");
    expect(source).toContain("source.reactionMode === 'withdrawn'");
    expect(source).toContain("source.reactionMode === 'repairing'");
    expect(source).toContain("{ reactionMode: source.reactionMode }");
  });

  it("keeps relationship conversation and repair fields during normalization", async () => {
    const source = await readFile("src/services/kdmPersistenceService.ts", "utf8");
    expect(source).toContain("relationship.conversationState === 'active'");
    expect(source).toContain("relationship.conversationState === 'distancing'");
    expect(source).toContain("relationship.conversationState === 'disengaged'");
    expect(source).toContain("relationship.conversationState === 'repairing'");
    expect(source).toContain("{ conversationState: relationship.conversationState }");
    expect(source).toContain("{ disengagedAt: relationship.disengagedAt }");
    expect(source).toContain("{ disengageReason: relationship.disengageReason }");
    expect(source).toContain("repairAttempts: Math.max(0, relationship.repairAttempts)");
  });
});
