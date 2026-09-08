import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("KDM canonical SemanticInterpretation@2 authority", () => {
  it("receives the ingestion-time interpretation, deterministic event projection, behavior policy, and affect baseline", () => {
    const server = source("server.ts");
    expect(server).toContain('import { analyzeKdmInteractionCanonicalTurn } from "./src/services/kdmConsistencyEngine"');
    expect(server).toMatch(/analyzeKdmInteractionCanonicalTurn\(\s*userMessage,\s*basePersonality,\s*effective,\s*canonicalSemantic\.interpretation,\s*canonicalSemantic\.event,\s*behaviorPolicy,\s*affectBaseline,\s*\)/u);
    expect(server).not.toMatch(/\banalyzeKdmInteraction\(/u);
  });

  it("feeds SemanticInterpretation@2 into the canonical G4 relationship projection seam", () => {
    const kdm = source("src/services/kdmConsistencyEngine.ts");
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    expect(kdm).toContain("export function analyzeKdmInteractionCanonicalTurn(");
    expect(kdm).toContain("semanticInterpretation,");
    expect(kdm).toContain("semanticEvent,");
    expect(kdm).toContain("return analyzeKdmInteractionCanonical({");
    expect(bridge).toContain("semanticInterpretation: SemanticInterpretation");
    expect(bridge).toContain("const socialAppraisal = resolveRuntimeSocialAppraisal({");
    expect(bridge).toContain("semantic: semanticInterpretation,");
    expect(bridge).toContain("const signal = relationshipSignalFromRuntimeAppraisal(");
    expect(bridge).toContain("semanticInterpretation,");
    expect(bridge).not.toContain("buildTurnSignal(");
    expect(bridge).not.toContain("interpretationFromLegacyEvent");
  });

  it("never reparses raw text inside the authoritative relationship bridge", () => {
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    const projection = source("src/services/socialAppraisalRuntimeProjection.ts");
    expect(bridge).not.toContain("interpretSemanticEvent(");
    expect(bridge).not.toContain("interpretationFromRegexFloor");
    expect(bridge).not.toMatch(/\.test\(semantic(?:Event|Interpretation)\.raw\)/u);
    expect(bridge).toContain("semanticNegativePattern(semanticInterpretation)");
    expect(projection).not.toContain("interpretSemanticEvent(");
    expect(projection).not.toContain("interpretationFromRegexFloor");
    expect(projection).not.toMatch(/\.test\(.*\.raw\)/u);
    expect(projection).toContain("relationshipSignalFromRuntimeAppraisal(");
  });

  it("uses upstream grounded relationship scope as a projection gate without creating a third semantic authority", () => {
    const bridge = source("src/services/kdmRelationshipReducerBridge.ts");
    const projection = source("src/services/socialAppraisalRuntimeProjection.ts");
    expect(bridge).toContain("relationshipScope?: SemanticRelationshipScope");
    expect(bridge).toContain("relationshipScope: semanticEvent.relationshipScope,");
    expect(bridge).toContain("semanticEvent.relationshipScope,");
    expect(projection).toContain('scope !== "third_party" && scope !== "event"');
    expect(projection).toContain('valence: "neutral" as const');
    expect(projection).toContain("significance: 0");
    expect(projection).toContain("harmEvidence: 0");
    expect(projection).toContain("repairEvidence: 0");
    expect(projection).toContain("apology: repairMaterial && interp.apology");
    expect(projection).toContain("repairAttempt: repairMaterial && interp.repairAttempt");
    expect(projection).not.toContain("resolveMessageEntities(");
    expect(projection).not.toContain("buildCanonicalWorldEvent(");
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
