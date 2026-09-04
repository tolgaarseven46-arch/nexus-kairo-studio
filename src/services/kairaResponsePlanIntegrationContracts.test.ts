import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const local = fs.readFileSync(path.resolve(process.cwd(), "src/services/kairoLocalLanguageEngine.ts"), "utf8");
const persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");
const chat = fs.readFileSync(path.resolve(process.cwd(), "src/services/droitChatService.ts"), "utf8");
const nexus = fs.readFileSync(path.resolve(process.cwd(), "src/types/nexus.ts"), "utf8");
const layout = fs.readFileSync(path.resolve(process.cwd(), "src/components/studio/NexusStudioLayout.tsx"), "utf8");
const mindMap = fs.readFileSync(path.resolve(process.cwd(), "src/components/studio/tabs/MindMapTab.tsx"), "utf8");
const unifiedPass = fs.readFileSync(path.resolve(process.cwd(), "src/services/kairaResponseConstraintPass.ts"), "utf8");

describe("canonical KairaResponsePlan runtime integration", () => {
  it("builds one response plan from contract, dialogue and HOW-only speech", () => {
    expect(server).toContain("buildKairaResponsePlan(behaviorContract, dialogueDecision, speech)");
    expect(server).toContain("buildCanonicalBehaviorBlock(responsePlan)");
    expect(server).not.toContain("kairaResponsePlanInstruction(responsePlan)");
  });

  it("feeds the same plan to local and canonical AI verbalizers", () => {
    expect(local).toContain("responsePlan?: KairaResponsePlan");
    expect(server).toMatch(/dialogueDecision\.move,\s*responsePlan,\s*languageUnderstanding\.event,\s*kairaPolicy\.persistentUserMemory,\s*discourseState,\s*\)/u);
    expect(server).toContain("${responsePlanInstruction}\\n${canonicalObservationalContext}");
    expect(server).not.toContain("${responsePlanInstruction}\\nKDM:");
  });

  it("validates legacy repair/fallback and canonical final-delivery outputs", () => {
    expect(server).toContain("findKairaResponsePlanIssues(repairedReply, responsePlan)");
    expect(server).toContain("findKairaResponsePlanIssues(fallback, responsePlan)");
    expect(server).toContain("localPlanIssues = canonicalConstraint?.issues ?? findKairaResponsePlanIssues(reply, responsePlan)");
    expect(server).toContain("postEnforcementPlanIssues = canonicalConstraint?.issues ?? findKairaResponsePlanIssues(reply, responsePlan)");
    expect(server).toContain("findKairaResponsePlanIssues(candidateReply, responsePlan)");
    expect(server).toContain("response_plan_delivery_fallback");
    expect(server).toContain("const finalIssues = canonicalConstraint");
    expect(server).toContain("...canonicalExternalIssues, ...finalPlanIssues");
    expect(server).toContain("...groundingIssues, ...finalPlanIssues, ...finalEpistemicIssues");
    expect(unifiedPass).toContain("findKairaResponsePlanIssues(delivered, input.plan)");
    expect(unifiedPass).not.toContain('runOrderedPass("tamam", input)');
  });

  it("persists response-plan observability in both local and AI paths", () => {
    const kntPlanWrites = server.match(/worldMemoryGuard,\s*epistemicAccess,\s*(?:selfMemoryRuntime,\s*)?(?:livedMemoryRuntime,\s*)?responsePlan,\s*\}\),/gu)?.length ?? 0;
    const turnMetadataPlanWrites = server.match(/worldMemoryGuard,\s*epistemicAccess,\s*(?:selfMemoryRuntime,\s*)?(?:livedMemoryRuntime,\s*)?responsePlan,\s*timings:/gu)?.length ?? 0;

    expect(kntPlanWrites).toBeGreaterThanOrEqual(2);
    expect(turnMetadataPlanWrites).toBeGreaterThanOrEqual(2);
  });

  it("persists, hydrates and exposes the response plan per turn", () => {
    expect(persistence).toContain("responsePlan: payload.metadata?.responsePlan");
    expect(persistence).toContain("lastResponsePlan: lastTurn?.metadata?.responsePlan");
    expect(nexus).toContain("responsePlan?: unknown");
    expect(nexus).toContain("lastResponsePlan?: unknown");
    expect(chat).toContain("responsePlan?: unknown");
    expect(chat).toContain("responsePlan: data.kdm?.responsePlan");
  });

  it("shows the same response plan in Studio KNT and copied last-turn reports", () => {
    expect(layout).toContain("setLastResponsePlan(response.responsePlan ?? null)");
    expect(layout).toContain("setLastResponsePlan(restored.lastResponsePlan ?? null)");
    expect(layout).toContain("responsePlan={lastResponsePlan}");
    expect(mindMap).toContain("responsePlan?: unknown");
    expect(mindMap).toContain("Response plan: move=");
    expect(mindMap).toContain('label="CEVAP PLANI"');
  });
});
