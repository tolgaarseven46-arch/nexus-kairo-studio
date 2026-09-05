import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const client = read("src/services/droitChatService.ts");

const between = (text: string, start: string, end: string) => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  return from >= 0 && to > from ? text.slice(from, to) : "";
};

describe("temperament behavior preview before canonical KDM handoff", () => {
  it("computes the temperament preview before behavior layers", () => {
    expect(client).toContain("const temperamentAdjustedState = projectTemperamentForBehavior(semanticEvent, dynamicState, fineTune)");
    expect(client.indexOf("const temperamentAdjustedState = projectTemperamentForBehavior"))
      .toBeLessThan(client.indexOf("const socialRuntime = applySocialOrientation"));
  });

  it("keeps canonical dynamic state unmodified at the authoritative server KDM boundary", () => {
    const payload = between(client, "const payload =", "const controller =");
    expect(payload).toContain("behaviorPolicy, dynamicState, affectBaseline, history:");
    expect(payload).not.toContain("temperamentAdjustedState");
    expect(client).not.toContain("dynamicState: temperamentAdjustedState ?? dynamicState");
  });

  it("keeps the projected temperament state available only to behavior synthesis", () => {
    expect(client).toContain("dynamicState: temperamentAdjustedState,");
    expect(client).toContain("const socialRuntime = applySocialOrientation(preferenceRuntime.personality, fineTune, userMessage, temperamentAdjustedState)");
  });

  it("sends resting affect baseline through a separate typed request field", () => {
    expect(client).toContain("const affectBaseline = kairaAffectBaselineFromFineTune(fineTune)");
    expect(client).toContain("behaviorPolicy, dynamicState, affectBaseline, history:");
  });

  it("retains raw canonical and projected behavior state in the client audit boundary", () => {
    expect(client).toContain("rawDynamicStateBefore: dynamicState");
    expect(client).toContain("temperamentAdjustedState");
  });
});
