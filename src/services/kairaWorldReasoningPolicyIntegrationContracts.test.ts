import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const finalPrompt = fs.readFileSync(path.resolve(process.cwd(), "src/services/kairaFinalProviderPrompt.ts"), "utf8");

describe("world reasoning policy runtime integration contract", () => {
  it("derives reasoning policy from read-only world-state appraisal", () => {
    expect(server).toContain('from "./src/services/worldReasoningPolicy"');
    expect(server).toContain("deriveWorldReasoningPolicy(worldStateAppraisal)");
    expect(server).toContain("buildWorldReasoningPolicyInstruction(worldReasoningPolicy)");
  });

  it("injects reasoning policy after appraisal and before canonical dialogue/behavior authority", () => {
    expect(server).toContain("buildKairaFinalProviderSystemPrompt({");
    expect(server).toContain("worldStateAppraisalInstruction,");
    expect(server).toContain("worldReasoningPolicyInstruction,");
    expect(server).toContain("dialogueInstruction,");
    expect(server).toContain("dialogueDecisionInstruction,");
    expect(server).toContain("responsePlanInstruction,");
    expect(server).toContain("canonicalObservationalContext,");

    const appraisalIndex = finalPrompt.indexOf("${parts.worldStateAppraisalInstruction}");
    const policyIndex = finalPrompt.indexOf("${parts.worldReasoningPolicyInstruction}");
    const dialogueIndex = finalPrompt.indexOf("${parts.dialogueInstruction}");
    const dialogueDecisionIndex = finalPrompt.indexOf("${parts.dialogueDecisionInstruction}");
    const responsePlanIndex = finalPrompt.indexOf("${parts.responsePlanInstruction}");
    const observationalIndex = finalPrompt.indexOf("${parts.canonicalObservationalContext}", responsePlanIndex);

    expect(appraisalIndex).toBeGreaterThan(0);
    expect(policyIndex).toBeGreaterThan(appraisalIndex);
    expect(dialogueIndex).toBeGreaterThan(policyIndex);
    expect(dialogueDecisionIndex).toBeGreaterThan(dialogueIndex);
    expect(responsePlanIndex).toBeGreaterThan(dialogueDecisionIndex);
    expect(observationalIndex).toBeGreaterThan(responsePlanIndex);
    expect(server).not.toContain("${behaviorContractInstruction(behaviorContract)}");
    expect(finalPrompt).not.toContain("${parts.behaviorContractInstruction}");
  });

  it("passes the canonical reasoning policy and typed memory query to deterministic final enforcement", () => {
    expect(server).toContain("const worldReasoningContext = {");
    expect(server).toContain("appraisal: worldStateAppraisal");
    expect(server).toContain("policy: worldReasoningPolicy");
    expect(server).toContain("memoryQuery: canonicalSemantic.interpretation.worldMemory?.query ?? null");
    expect(server).toContain("retrievedWorldEvents, worldReasoningContext");
  });

  it("does not feed world reasoning policy into KDM state mutation", () => {
    const kdmCallStart = server.indexOf("kdm = analyzeKdmInteraction(");
    const kdmCallEnd = server.indexOf(");", kdmCallStart);
    const kdmCall = server.slice(kdmCallStart, kdmCallEnd + 2);

    expect(kdmCall).not.toContain("worldReasoningPolicy");
    expect(kdmCall).not.toContain("worldStateAppraisal");
  });
});
