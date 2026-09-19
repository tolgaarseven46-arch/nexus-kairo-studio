import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter first-user-turn hydration v9", () => {
  it("skips remote relationship hydration when there is no prior user turn", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("const isFirstEncounterFirstUserTurn");
    expect(server).toContain('cleanHistory.every((turn: any) => turn.sender !== "user")');
    expect(server).toContain("isFirstEncounterFirstUserTurn");
    expect(server).toMatch(/isFirstEncounterFirstUserTurn\s*\?\s*Promise\.resolve\(null\)/);
  });

  it("keeps persistent relationship hydration for later first-encounter and default turns", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("loadKdmState(stateUserId)");
    expect(server).toContain("kairaPolicy.persistentRelationship");
  });
});
