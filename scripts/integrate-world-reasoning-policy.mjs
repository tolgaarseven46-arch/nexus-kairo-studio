import fs from "node:fs";
// trigger one-time integration workflow

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
    label: "reasoning policy import",
    before: 'import { appraiseRetrievedWorldState, buildWorldStateAppraisalInstruction } from "./src/services/worldStateAppraisal";\n',
    after: 'import { appraiseRetrievedWorldState, buildWorldStateAppraisalInstruction } from "./src/services/worldStateAppraisal";\nimport { deriveWorldReasoningPolicy, buildWorldReasoningPolicyInstruction } from "./src/services/worldReasoningPolicy";\n',
  },
  {
    label: "reasoning policy construction",
    before: '    const worldStateAppraisal = appraiseRetrievedWorldState(retrievedWorldEvents);\n    const worldStateAppraisalInstruction = buildWorldStateAppraisalInstruction(worldStateAppraisal);\n',
    after: '    const worldStateAppraisal = appraiseRetrievedWorldState(retrievedWorldEvents);\n    const worldStateAppraisalInstruction = buildWorldStateAppraisalInstruction(worldStateAppraisal);\n    const worldReasoningPolicy = deriveWorldReasoningPolicy(worldStateAppraisal);\n    const worldReasoningPolicyInstruction = buildWorldReasoningPolicyInstruction(worldReasoningPolicy);\n',
  },
  {
    label: "reasoning policy prompt seam",
    before: '${worldEventMemoryInstruction}\\n${worldStateAppraisalInstruction}\\n${dialogueInstruction}',
    after: '${worldEventMemoryInstruction}\\n${worldStateAppraisalInstruction}\\n${worldReasoningPolicyInstruction}\\n${dialogueInstruction}',
  },
]);

patchFile("src/services/kairaContractRegistry.ts", [
  {
    label: "world reasoning policy registry",
    before: '  {\n    id: "relationship-state",\n',
    after: '  {\n    id: "world-reasoning-policy",\n    version: 1,\n    status: "active",\n    ownerLayer: "world-reasoning-policy",\n    consumerLayers: ["response-generation", "consistency", "world-model-response-guard"],\n    summary: "Read-only world-state appraisal is converted into bounded response permissions: answer from evidence, preserve conflict, keep reported attribution, or avoid unsupported current-state claims. This policy has no authority over relationship, emotion, personality or dynamic state.",\n  },\n  {\n    id: "relationship-state",\n',
  },
]);

console.log("world reasoning policy integrated into server + contract registry");
