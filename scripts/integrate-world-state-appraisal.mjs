import fs from "node:fs";

function patchFile(path, patches) {
  let text = fs.readFileSync(path, "utf8");
  for (const { label, before, after } of patches) {
    const count = text.split(before).length - 1;
    if (count !== 1) throw new Error(`${path} ${label}: expected exactly one match, found ${count}`);
    text = text.replace(before, after);
  }
  fs.writeFileSync(path, text);
}

patchFile("server.ts", [
  {
    label: "appraisal import",
    before: 'import { enforceWorldModelRecallResponse, findWorldModelResponseIssues } from "./src/services/worldModelResponseGuard";\n',
    after: 'import { enforceWorldModelRecallResponse, findWorldModelResponseIssues } from "./src/services/worldModelResponseGuard";\nimport { appraiseRetrievedWorldState, buildWorldStateAppraisalInstruction } from "./src/services/worldStateAppraisal";\n',
  },
  {
    label: "appraisal construction",
    before: '    const worldEventMemoryInstruction = buildWorldEventMemoryInstruction(retrievedWorldEvents);\n',
    after: '    const worldEventMemoryInstruction = buildWorldEventMemoryInstruction(retrievedWorldEvents);\n    const worldStateAppraisal = appraiseRetrievedWorldState(retrievedWorldEvents);\n    const worldStateAppraisalInstruction = buildWorldStateAppraisalInstruction(worldStateAppraisal);\n',
  },
  {
    label: "appraisal prompt seam",
    before: '${worldEventInstruction}\\n${worldEventMemoryInstruction}\\n${dialogueInstruction}',
    after: '${worldEventInstruction}\\n${worldEventMemoryInstruction}\\n${worldStateAppraisalInstruction}\\n${dialogueInstruction}',
  },
]);

patchFile("src/services/kairaContractRegistry.ts", [
  {
    label: "world-state appraisal registry",
    before: '  {\n    id: "relationship-state",\n',
    after: '  {\n    id: "world-state-appraisal",\n    version: 1,\n    status: "active",\n    ownerLayer: "world-state-appraisal",\n    consumerLayers: ["response-generation", "consistency", "future-reasoning-policy"],\n    summary: "Retrieved canonical world evidence is reduced to read-only epistemic/reasoning permissions. It may constrain response truth posture and qualifiers but cannot mutate relationship, emotion, personality or dynamic state.",\n  },\n  {\n    id: "relationship-state",\n',
  },
]);

console.log("world-state appraisal integrated into server + contract registry");
// trigger: 2026-08-30
