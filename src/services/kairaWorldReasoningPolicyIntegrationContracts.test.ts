import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");

describe("world reasoning policy runtime integration contract", () => {
  it("derives reasoning policy from read-only world-state appraisal", () => {
    expect(server).toContain('from "./src/services/worldReasoningPolicy"');
    expect(server).toContain("deriveWorldReasoningPolicy(worldStateAppraisal)");
    expect(server).toContain("buildWorldReasoningPolicyInstruction(worldReasoningPolicy)");
  });

  it("injects reasoning policy after appraisal and before canonical dialogue/behavior authority", () => {
    const appraisalIndex = server.indexOf("${worldStateAppraisalInstruction}");
    const policyIndex = server.indexOf("${worldReasoningPolicyInstruction}");
    const dialogueIndex = server.indexOf("${dialogueInstruction}");
    const dialogueDecisionIndex = server.indexOf("${dialogueDecisionInstruction}");
    const responsePlanIndex = server.indexOf("${responsePlanInstruction}");
    const observationalIndex = server.indexOf("${canonicalObservationalContext}", responsePlanIndex);

    expect(appraisalIndex).toBeGreaterThan(0);
    expect(policyIndex).toBeGreaterThan(appraisalIndex);
    expect(dialogueIndex).toBeGreaterThan(policyIndex);
    expect(dialogueDecisionIndex).toBeGreaterThan(dialogueIndex);
    expect(responsePlanIndex).toBeGreaterThan(dialogueDecisionIndex);
    expect(observationalIndex).toBeGreaterThan(responsePlanIndex);
    expect(server).not.toContain("${behaviorContractInstruction(behaviorContract)}");
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
