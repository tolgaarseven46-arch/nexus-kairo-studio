import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("canonical affect runtime authority regression", () => {
  const client = fs.readFileSync("src/services/droitChatService.ts", "utf8");
  const server = fs.readFileSync("server.ts", "utf8");
  const bridge = fs.readFileSync("src/services/kdmRelationshipReducerBridge.ts", "utf8");

  it("keeps client temperament as behavior preview instead of canonical recovery", () => {
    expect(client).toContain("projectTemperamentForBehavior");
    expect(client).not.toContain("recoverTemperamentAffect(");
    expect(client).toContain("behaviorPolicy, dynamicState, affectBaseline, history:");
    expect(client).not.toContain("dynamicState: temperamentAdjustedState ?? dynamicState");
  });

  it("carries a separate typed baseline into the canonical server KDM transition", () => {
    expect(server).toContain("affectBaseline: incomingAffectBaseline");
    expect(server).toContain("normalizeKairaAffectBaseline(incomingAffectBaseline)");
    expect(bridge).toContain("affectBaseline: input.affectBaseline");
  });
});
