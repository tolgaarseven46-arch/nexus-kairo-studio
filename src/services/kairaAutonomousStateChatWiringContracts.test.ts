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
    expect(text).toContain("const saveAutonomousState = () =>");
    expect(text).toContain("kairaPolicy.autonomousActivityPlanning && autonomousStateSourceId");
    expect(text).toContain("if (!firstEncounterFastPersistence)");

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
    const firstSource = text.indexOf("const autonomousStateSourceId = requestId");
    const secondSource = text.indexOf(
      "const autonomousStateSourceId = requestId",
      firstSource + 1,
    );
    expect(firstSource).toBeGreaterThan(-1);
    expect(secondSource).toBeGreaterThan(firstSource);

    const firstSavedTurn = text.lastIndexOf("savedTurnId = turn.turnId;", firstSource);
    const secondSavedTurn = text.lastIndexOf("savedTurnId = t.turnId;", secondSource);
    expect(firstSavedTurn).toBeGreaterThan(-1);
    expect(firstSavedTurn).toBeLessThan(firstSource);
    expect(secondSavedTurn).toBeGreaterThan(-1);
    expect(secondSavedTurn).toBeLessThan(secondSource);
  });

  it("keeps autonomous-state persistence best-effort for chat delivery", () => {
    const text = source();
    expect(text).toContain("await Promise.allSettled([saveAutonomousState()])");
    expect(text.match(/await Promise\.allSettled\(\[\s*observeKairaActivityDynamicState/g)?.length).toBeGreaterThanOrEqual(1);
  });
});
