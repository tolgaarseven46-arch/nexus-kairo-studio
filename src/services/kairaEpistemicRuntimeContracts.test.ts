import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const serverSource = () => readFileSync("server.ts", "utf8");
const unifiedPassSource = () => readFileSync("src/services/kairaResponseConstraintPass.ts", "utf8");

describe("Kaira epistemic runtime contracts", () => {
  it("lets the canonical semantic provider identify a knowledge query without answering it", async () => {
    const semanticProvider = createLlmSemanticUnderstandingProvider({
      generate: async () => JSON.stringify({
        schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
        raw: "opera nedir",
        normalized: "opera nedir",
        primaryIntent: "information_request",
        secondarySocialActs: [],
        target: "unknown",
        valence: "neutral",
        severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
        jokingConfidence: 0,
        sincerityConfidence: 0.9,
        affection: 0,
        support: 0,
        compliment: 0,
        emotionalLoad: 0,
        apology: false,
        repairAttempt: false,
        stopRequest: false,
        discourseFacets: {
          socialRoutine: "none",
          discourseAct: "none",
          repairSignal: "none",
          adviceRequested: false,
          knowledgeQuery: { surface: "opera", confidence: 0.96 },
          selfMemoryQuery: null,
          relationalAct: "none",
          relationalIntensity: 0,
          stopQuestions: false,
          stopTalking: false,
        },
        uncertainty: { overall: 0.08, intent: 0.05, target: 0.15, severity: 0.05 },
        evidence: [{ source: "llm", cues: ["opera nedir"], confidence: 0.96 }],
      }),
    });
    const result = await understandTurkishMessage("opera nedir", { semanticProvider });
    expect(result.interpretation.discourseFacets.knowledgeQuery).toEqual({ surface: "opera", confidence: 0.96 });
    expect(result.event.knowledgeQuery).toEqual({ surface: "opera", confidence: 0.96 });
  });

  it("does not invent a knowledge query in deterministic fallback", async () => {
    const result = await understandTurkishMessage("naber kaira");
    expect(result.event.knowledgeQuery ?? null).toBeNull();
  });

  it("wires instance-owned knowledge through the canonical epistemic guard before final social enforcement", () => {
    const server = serverSource();
    expect(server).toContain('loadKairaKnowledgeProfileResult(kairaInstance.instanceId)');
    expect(server).toContain('evaluateKairaKnowledge(');
    expect(server).toContain('buildKairaEpistemicInstruction(epistemicAccess)');
    expect(server).toMatch(/epistemicAccess\s*,\s*selfMemoryRuntime\s*,\s*(?:livedMemoryRuntime\s*,\s*)?behaviorContract/);
    expect(server).not.toContain('isCanonicalBehaviorFlagEnabled("UNIFIED_GUARD_PASS")');
    expect(server).toContain('runKairaResponseConstraintPass({');
    expect(server).toContain('epistemicContext: epistemicAccess');

    const pass = unifiedPassSource();
    const world = pass.indexOf('enforceWorldModelRecallResponse(');
    const selfMemory = pass.indexOf('enforceKairaAutobiographicalResponse(');
    const epistemic = pass.indexOf('enforceKairaEpistemicResponse(');
    const social = pass.indexOf('enforceKairoResponse(');
    expect(world).toBeGreaterThan(-1);
    expect(world).toBeLessThan(selfMemory);
    expect(selfMemory).toBeLessThan(epistemic);
    expect(epistemic).toBeLessThan(social);
  });

  it("keeps caller-supplied fallback behind the same truth and social final authority without a generic guard-authored reply", () => {
    const server = serverSource();
    expect(server).toContain('fallbackFactory: () =>');
    const pass = unifiedPassSource();
    expect(pass).toContain('const candidate = runOrderedPass(preferredFallback, input)');
    expect(pass).not.toContain('runOrderedPass("tamam", input)');
    expect(pass).toContain('findKairaResponsePlanIssues(delivered, input.plan)');
    expect(pass).toContain('findKairaEpistemicResponseIssues(delivered, input.epistemicContext)');
  });

  it("fails closed when the instance knowledge profile cannot be read", () => {
    const server = serverSource();
    expect(server).toContain('await loadKairaKnowledgeProfileResult(kairaInstance.instanceId)');
    expect(server).toContain('knowledgeProfileLoad?.status === "unavailable"');
    expect(server).toContain('unavailableKairaKnowledgeDecision()');
    expect(server).not.toContain('loadKairaKnowledgeProfile(kairaInstance.instanceId).catch(() => null)');
  });

  it("does not read Firestore knowledge profiles for ordinary non-knowledge turns", () => {
    const server = serverSource();
    expect(server).toMatch(/knowledgeQuery && kairaPolicy\.persistentIdentity[\s\S]*loadKairaKnowledgeProfile/);
  });
});
