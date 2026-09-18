import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter session persistence latency v5", () => {
  it("allows a caller-supplied deterministic turn number without a Firestore pre-read", async () => {
    const persistence = await readFile(new URL("./kdmPersistenceService.ts", import.meta.url), "utf8");
    expect(persistence).toContain("turnNumberHint");
    expect(persistence).toContain("payload.turnNumberHint");
    expect(persistence).toContain("if (!payload.turnNumberHint)");
  });

  it("derives the first-encounter fast turn number from canonical request history", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("firstEncounterTurnNumberHint");
    expect(server).toContain('cleanHistory.filter((turn: any) => turn.sender === "user").length + 1');
    expect(server).toContain("turnNumberHint: firstEncounterTurnNumberHint");
  });
});
