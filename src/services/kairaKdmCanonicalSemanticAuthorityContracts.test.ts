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
    expect(bridge).toContain("buildTurnSignal(semanticInterpretation, semanticEvent, negativePattern)");
    expect(bridge).not.toContain("interpretationFromLegacyEvent");
  });

  it("never reparses raw text inside the authoritative relationship bridge", () => {
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    expect(bridge).not.toContain("interpretSemanticEvent(");
    expect(bridge).not.toContain("interpretationFromRegexFloor");
    expect(bridge).not.toMatch(/\.test\(semantic(?:Event|Interpretation)\.raw\)/u);
    expect(bridge).toContain('const thirdParty = event.relationshipScope === "third_party"');
    expect(bridge).toContain("userStop: thirdParty ? false : interp.stopRequest");
    expect(bridge).toContain("semanticNegativePattern(semanticInterpretation)");
  });

  it("uses upstream grounded relationship scope without creating a third semantic authority", () => {
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    expect(bridge).toContain("relationshipScope?: SemanticRelationshipScope");
    expect(bridge).toContain('negativePattern: thirdParty ? null : negativePattern');
    expect(bridge).toContain('apology: thirdParty ? false : interp.apology');
    expect(bridge).not.toContain("resolveMessageEntities(");
    expect(bridge).not.toContain("buildCanonicalWorldEvent(");
  });

  it("keeps question-stop distinct from full-conversation stop at the v2 boundary", () => {
    const typeSource = source("src/types/semanticInterpretation.ts");
    const schema = source("src/services/semanticInterpretationSchema.ts");
    const fallback = source("src/services/semanticInterpretationLegacyProjection.ts");
    const provider = source("src/services/llmSemanticUnderstandingProvider.ts");
    expect(typeSource).toContain("must equal discourseFacets.stopTalking");
    expect(schema).toContain("stopRequest: discourseFacets.stopTalking");
    expect(schema).toContain("v.stopRequest === (v.discourseFacets as Record<string, unknown>).stopTalking");
    expect(fallback).toContain("stopRequest: Boolean(event.stopTalking)");
    expect(fallback).not.toContain("stopRequest: Boolean(event.stopTalking || event.stopQuestions)");
    expect(provider).toContain("stopRequest = YALNIZ tam konuşmayı durdurma isteği");
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
