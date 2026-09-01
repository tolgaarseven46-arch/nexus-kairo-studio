import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { understandTurkishMessage } from "./languageUnderstandingService";

describe("Kaira epistemic runtime contracts", () => {
  it("lets the canonical semantic provider identify a knowledge query without answering it", async () => {
    const semanticProvider = createLlmSemanticUnderstandingProvider({
      generate: async () => JSON.stringify({
        raw: "opera nedir", normalized: "opera nedir", intent: "information_request", socialRoutine: "none", discourseAct: "none", repairSignal: "none", adviceRequested: false,
        knowledgeQuery: { surface: "opera", confidence: 0.96 }, valence: "neutral", target: "unknown", relationalAct: "none", relationalIntensity: 0, severity: 0, insult: false, redLine: false, disrespect: 0, coercion: 0, manipulation: 0, privacyViolation: 0, apology: false, repairAttempt: false, stopQuestions: false, stopTalking: false, frustration: 0, emotionalLoad: 0, affection: 0, support: 0, compliment: 0,
      }),
    });
    const result = await understandTurkishMessage("opera nedir", { semanticProvider });
    expect(result.event.knowledgeQuery).toEqual({ surface: "opera", confidence: 0.96 });
  });

  it("does not invent a knowledge query in deterministic fallback", async () => {
    const result = await understandTurkishMessage("naber kaira");
    expect(result.event.knowledgeQuery ?? null).toBeNull();
  });

  it("wires instance-owned knowledge through the epistemic gate before behavior enforcement", () => {
    const server = readFileSync("server.ts", "utf8");
    expect(server).toContain('loadKairaKnowledgeProfileResult(kairaInstance.instanceId)');
    expect(server).toContain('evaluateKairaKnowledge(');
    expect(server).toContain('buildKairaEpistemicInstruction(epistemicAccess)');
    expect(server).toContain('enforceKairaEpistemicResponse(worldMemoryGuard.reply, epistemicAccess)');
    expect(server.indexOf('const epistemicGuard = enforceKairaEpistemicResponse(reply, epistemicAccess)')).toBeLessThan(server.indexOf('const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules)'));
    expect(server).toContain('epistemicAccess, behaviorContract');
    expect(server).toContain('const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateWorldGuard.reply, epistemicAccess)');
    expect(server).toContain('const finalEpistemicIssues = findKairaEpistemicResponseIssues(reply, epistemicAccess)');
  });

  it("keeps every post-plan fallback behind world, epistemic and social final authority", () => {
    const server = readFileSync("server.ts", "utf8");
    const candidateWorld = server.indexOf("const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents)");
    const candidateEpistemic = server.indexOf("const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateWorldGuard.reply, epistemicAccess)");
    const candidateSocial = server.indexOf("const candidateBaseEnforced = enforceKairoResponse(candidateEpistemicGuard.reply, kdm.trace, enforcementRules)");
    const candidateContract = server.indexOf("const candidateContractEnforced = enforceBehaviorContract(candidateBaseEnforced.reply, kdm.trace, behaviorContract)");
    const finalEpistemic = server.indexOf("const finalEpistemicIssues = findKairaEpistemicResponseIssues(reply, epistemicAccess)");
    expect(candidateWorld).toBeGreaterThan(-1);
    expect(candidateWorld).toBeLessThan(candidateEpistemic);
    expect(candidateEpistemic).toBeLessThan(candidateSocial);
    expect(candidateSocial).toBeLessThan(candidateContract);
    expect(candidateContract).toBeLessThan(finalEpistemic);
  });

  it("fails closed when the instance knowledge profile cannot be read", () => {
    const server = readFileSync("server.ts", "utf8");
    expect(server).toContain('await loadKairaKnowledgeProfileResult(kairaInstance.instanceId)');
    expect(server).toContain('knowledgeProfileLoad?.status === "unavailable"');
    expect(server).toContain('unavailableKairaKnowledgeDecision()');
    expect(server).not.toContain('loadKairaKnowledgeProfile(kairaInstance.instanceId).catch(() => null)');
  });

  it("does not read Firestore knowledge profiles for ordinary non-knowledge turns", () => {
    const server = readFileSync("server.ts", "utf8");
    expect(server).toMatch(/knowledgeQuery && kairaPolicy\.persistentIdentity[\s\S]*loadKairaKnowledgeProfile/);
  });
});
