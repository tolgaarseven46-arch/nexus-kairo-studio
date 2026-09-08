import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bridgeSource = readFileSync(new URL("./kdmRelationshipReducerBridge.ts", import.meta.url), "utf8");
const projectionSource = readFileSync(new URL("./socialAppraisalRuntimeProjection.ts", import.meta.url), "utf8");

describe("question-only stop relationship wiring regression", () => {
  it("projects typed relationship-neutral turns before reducer injury", () => {
    expect(bridgeSource).toContain("isRelationshipNeutralTurn(semanticInterpretation)");
    expect(bridgeSource).toContain("relationshipSignalFromRuntimeAppraisal(");
    expect(projectionSource).toContain("relationshipSeverityForInterpretation(interp)");
    expect(projectionSource).toContain("severity: projectSeverityMagnitude(baseSeverity, projectedHarmMagnitude)");
  });
});
