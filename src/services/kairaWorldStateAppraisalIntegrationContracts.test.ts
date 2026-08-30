import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");

describe("world-state appraisal runtime integration contract", () => {
  it("builds appraisal from retrieved canonical evidence and injects it into reasoning prompt", () => {
    expect(server).toContain('from "./src/services/worldStateAppraisal"');
    expect(server).toContain("appraiseRetrievedWorldState(retrievedWorldEvents)");
    expect(server).toContain("buildWorldStateAppraisalInstruction(worldStateAppraisal)");
    expect(server).toContain("${worldEventMemoryInstruction}\\n${worldStateAppraisalInstruction}\\n${dialogueInstruction}");
  });

  it("keeps retrieved world-state outside KDM state mutation input", () => {
    const kdmCallStart = server.indexOf("kdm = analyzeKdmInteraction(");
    const kdmCallEnd = server.indexOf("),\n      conversationAuthority", kdmCallStart);
    const kdmCall = server.slice(kdmCallStart, kdmCallEnd);

    expect(kdmCallStart).toBeGreaterThan(0);
    expect(kdmCallEnd).toBeGreaterThan(kdmCallStart);
    expect(kdmCall).not.toContain("worldStateAppraisal");
    expect(kdmCall).not.toContain("retrievedWorldEvents");
  });
});
