import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const client = read("src/services/droitChatService.ts");

describe("temperament before KDM state handoff", () => {
  it("computes the temperament-adjusted state before behavior layers", () => {
    expect(client).toContain("const temperamentAdjustedState = applyTemperamentBeforeKdm(semanticEvent, dynamicState)");
    expect(client.indexOf("const temperamentAdjustedState = applyTemperamentBeforeKdm"))
      .toBeLessThan(client.indexOf("const socialRuntime = applySocialOrientation"));
  });

  it("sends the same pre-KDM adjusted state to the authoritative server KDM", () => {
    expect(client).toContain("dynamicState: temperamentAdjustedState ?? dynamicState");
  });

  it("retains raw and adjusted state in the client audit boundary", () => {
    expect(client).toContain("rawDynamicStateBefore: dynamicState");
    expect(client).toContain("temperamentAdjustedState");
  });
});
