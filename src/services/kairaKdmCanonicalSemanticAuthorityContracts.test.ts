import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("KDM canonical SemanticInterpretation@2 authority", () => {
  it("receives the ingestion-time interpretation and its deterministic event projection", () => {
    const server = source("server.ts");
    expect(server).toContain('import { analyzeKdmInteractionCanonicalTurn } from "./src/services/kdmConsistencyEngine"');
    expect(server).toMatch(/analyzeKdmInteractionCanonicalTurn\(\s*userMessage,\s*basePersonality,\s*effective,\s*canonicalSemantic\.interpretation,\s*canonicalSemantic\.event,\s*behaviorPolicy,\s*\)/u);
    expect(server).not.toMatch(/\banalyzeKdmInteraction\(/u);
  });

  it("feeds SemanticInterpretation@2 directly into the canonical relationship bridge", () => {
    const kdm = source("src/services/kdmConsistencyEngine.ts");
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    expect(kdm).toContain("export function analyzeKdmInteractionCanonicalTurn(");
    expect(kdm).toContain("semanticInterpretation,");
    expect(kdm).toContain("semanticEvent,");
    expect(kdm).toContain("return analyzeKdmInteractionCanonical({");
    expect(bridge).toContain("semanticInterpretation: SemanticInterpretation");
    expect(bridge).toContain("buildTurnSignal(semanticInterpretation, negativePattern)");
    expect(bridge).not.toContain("interpretationFromLegacyEvent");
  });

  it("never reparses raw text inside the authoritative relationship bridge", () => {
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    expect(bridge).not.toContain("interpretSemanticEvent(");
    expect(bridge).not.toContain("interpretationFromRegexFloor");
    expect(bridge).not.toMatch(/\.test\(semantic(?:Event|Interpretation)\.raw\)/u);
    expect(bridge).toContain("userStop: interp.stopRequest");
    expect(bridge).toContain("semanticNegativePattern(semanticInterpretation)");
  });

  it("keeps the old raw-text helper outside the production server authority", () => {
    const kdm = source("src/services/kdmConsistencyEngine.ts");
    const server = source("server.ts");
    expect(kdm).toContain("Legacy/test ingress helper");
    expect(kdm).toContain("interpretationFromRegexFloor(userMessage)");
    expect(server).not.toContain("interpretationFromRegexFloor");
    expect(server).not.toMatch(/\banalyzeKdmInteraction\(/u);
  });
});
