import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = () => fs.readFileSync("server.ts", "utf8");

describe("Kaira autonomous state chat wiring contracts", () => {
  it("projects canonical post-turn state from both local and AI chat paths", () => {
    const text = source();
    expect(text).toContain(
      'import { observeKairaActivityDynamicState } from "./src/services/kairaActivityDynamicStateObservationCoordinator";',
    );
    expect(text.match(/observeKairaActivityDynamicState\(\{/g)?.length).toBe(2);
    expect(text.match(/if \(kairaPolicy\.autonomousActivityPlanning && autonomousStateSourceId\)/g)?.length).toBe(2);
    expect(text.match(/state: kdm\.nextDynamicState/g)?.length).toBe(2);
    expect(text.match(/ownerUserId: String\(userId\)/g)?.length).toBe(2);
  });

  it("uses stable request identity with canonical turn fallback", () => {
    const text = source();
    expect(text.match(/\? `chat_request:\$\{requestId\}`/g)?.length).toBe(2);
    expect(text.match(/\? `chat_turn:\$\{savedTurnId\}`/g)?.length).toBe(2);
    expect(text.match(/sourceId: autonomousStateSourceId/g)?.length).toBe(2);
  });

  it("observes autonomous state only after the canonical turn id can be persisted", () => {
    const text = source();
    const blocks = text.split("const autonomousStateSourceId = requestId");
    expect(blocks).toHaveLength(3);
    for (const before of blocks.slice(0, 2)) {
      expect(before.lastIndexOf("savedTurnId = t.turnId;")).toBeGreaterThan(before.lastIndexOf("const postStart = now();"));
    }
  });

  it("keeps autonomous-state persistence best-effort for chat delivery", () => {
    const text = source();
    expect(text.match(/await Promise\.allSettled\(\[\s*observeKairaActivityDynamicState/g)?.length).toBe(2);
  });
});
