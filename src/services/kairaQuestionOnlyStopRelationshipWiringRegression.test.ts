import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./kdmRelationshipReducerBridge.ts", import.meta.url), "utf8");

describe("question-only stop relationship wiring regression", () => {
  it("projects typed relationship-neutral turns before reducer injury", () => {
    expect(source).toContain("relationshipSeverityForInterpretation(interp)");
    expect(source).toContain("isRelationshipNeutralTurn(semanticInterpretation)");
    expect(source).toContain("severity: relationshipSeverityForInterpretation(interp)");
  });
});
