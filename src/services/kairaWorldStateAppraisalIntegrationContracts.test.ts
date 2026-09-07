import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const finalPrompt = fs.readFileSync(path.resolve(process.cwd(), "src/services/kairaFinalProviderPrompt.ts"), "utf8");

describe("world-state appraisal runtime integration contract", () => {
  it("builds appraisal from retrieved canonical evidence before bounded reasoning policy", () => {
    expect(server).toContain('from "./src/services/worldStateAppraisal"');
    expect(server).toContain("appraiseRetrievedWorldState(retrievedWorldEvents)");
    expect(server).toContain("buildWorldStateAppraisalInstruction(worldStateAppraisal)");
    expect(server).toContain("buildKairaFinalProviderSystemPrompt({");
    expect(server).toContain("worldEventMemoryInstruction,");
    expect(server).toContain("worldStateAppraisalInstruction,");
    expect(server).toContain("worldReasoningPolicyInstruction,");
    expect(server).toContain("epistemicInstruction,");
    expect(server).toContain("selfMemoryInstruction,");
    expect(server).toContain("dialogueInstruction,");

    const worldMemoryIndex = finalPrompt.indexOf("${parts.worldEventMemoryInstruction}");
    const appraisalIndex = finalPrompt.indexOf("${parts.worldStateAppraisalInstruction}");
    const policyIndex = finalPrompt.indexOf("${parts.worldReasoningPolicyInstruction}");
    const epistemicIndex = finalPrompt.indexOf("${parts.epistemicInstruction}");
    const selfMemoryIndex = finalPrompt.indexOf("${parts.selfMemoryInstruction}");
    const dialogueIndex = finalPrompt.indexOf("${parts.dialogueInstruction}");

    expect(worldMemoryIndex).toBeGreaterThan(0);
    expect(appraisalIndex).toBeGreaterThan(worldMemoryIndex);
    expect(policyIndex).toBeGreaterThan(appraisalIndex);
    expect(epistemicIndex).toBeGreaterThan(policyIndex);
    expect(selfMemoryIndex).toBeGreaterThan(epistemicIndex);
    expect(dialogueIndex).toBeGreaterThan(selfMemoryIndex);
  });

  it("keeps retrieved world-state outside KDM state mutation input", () => {
    const kdmCallStart = server.indexOf("kdm = analyzeKdmInteractionCanonicalTurn(");
    const kdmCallEnd = server.indexOf("),\n      behaviorContract", kdmCallStart);
    const kdmCall = server.slice(kdmCallStart, kdmCallEnd);

    expect(kdmCallStart).toBeGreaterThan(0);
    expect(kdmCallEnd).toBeGreaterThan(kdmCallStart);
    expect(kdmCall).not.toContain("worldStateAppraisal");
    expect(kdmCall).not.toContain("worldReasoningPolicy");
    expect(kdmCall).not.toContain("retrievedWorldEvents");
  });
});
