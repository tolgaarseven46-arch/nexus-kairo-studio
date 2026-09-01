import { readFileSync, writeFileSync } from "node:fs";

const path = "server.ts";
let source = readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Patch anchor missing: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch anchor not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceNth(label, before, after, occurrence) {
  let from = 0;
  let index = -1;
  for (let i = 0; i < occurrence; i += 1) {
    index = source.indexOf(before, from);
    if (index < 0) throw new Error(`Patch anchor missing: ${label} occurrence=${occurrence}`);
    from = index + before.length;
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "self-memory imports",
  'import { buildKairaRuntimeIdentityInstruction } from "./src/services/kairaRuntimeIdentity";\n',
  'import { buildKairaRuntimeIdentityInstruction } from "./src/services/kairaRuntimeIdentity";\nimport { resolveKairaAutobiographicalRecallRuntime } from "./src/services/kairaAutobiographicalRecallRuntime";\nimport { enforceKairaAutobiographicalResponse } from "./src/services/kairaAutobiographicalResponseGuard";\n',
);

replaceOnce(
  "self-memory runtime resolution",
  '    const epistemicInstruction = buildKairaEpistemicInstruction(epistemicAccess);\n    const dialogueAnalysis = projectSemanticEventToDialogueAnalysis(languageUnderstanding.event);',
  '    const epistemicInstruction = buildKairaEpistemicInstruction(epistemicAccess);\n    const selfMemoryRuntime = await resolveKairaAutobiographicalRecallRuntime({\n      instance: kairaInstance,\n      query: canonicalSemantic.event.selfMemoryQuery,\n    });\n    const selfMemoryInstruction = selfMemoryRuntime.instruction;\n    const dialogueAnalysis = projectSemanticEventToDialogueAnalysis(languageUnderstanding.event);',
);

replaceOnce(
  "local short-circuit boundary",
  '    if (local.handled && local.reply) {',
  '    if (!selfMemoryInstruction && local.handled && local.reply) {',
);

replaceOnce(
  "AI self-memory instruction",
  '${worldReasoningPolicyInstruction}\\n${epistemicInstruction}\\n${dialogueInstruction}',
  '${worldReasoningPolicyInstruction}\\n${epistemicInstruction}\\n${selfMemoryInstruction}\\n${dialogueInstruction}',
);

replaceOnce(
  "primary self-memory response guard",
  '    const epistemicGuard = enforceKairaEpistemicResponse(reply, epistemicAccess);\n    reply = epistemicGuard.reply;\n    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);',
  '    const selfMemoryGuard = enforceKairaAutobiographicalResponse(reply, selfMemoryRuntime);\n    reply = selfMemoryGuard.reply;\n    const epistemicGuard = enforceKairaEpistemicResponse(reply, epistemicAccess);\n    reply = epistemicGuard.reply;\n    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);',
);

replaceNth(
  "AI guard changed aggregation",
  '      changed: worldMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,',
  '      changed: worldMemoryGuard.changed || selfMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,',
  2,
);

replaceOnce(
  "post-enforcement candidate self-memory guard",
  '        const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents, worldReasoningContext);\n        const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateWorldGuard.reply, epistemicAccess);\n        const candidateBaseEnforced = enforceKairoResponse(candidateEpistemicGuard.reply, kdm.trace, enforcementRules);',
  '        const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents, worldReasoningContext);\n        const candidateSelfMemoryGuard = enforceKairaAutobiographicalResponse(candidateWorldGuard.reply, selfMemoryRuntime);\n        const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateSelfMemoryGuard.reply, epistemicAccess);\n        const candidateBaseEnforced = enforceKairoResponse(candidateEpistemicGuard.reply, kdm.trace, enforcementRules);',
);

const observabilityAnchor = '          epistemicAccess,\n          responsePlan,';
const observabilityCount = source.split(observabilityAnchor).length - 1;
if (observabilityCount < 2) throw new Error(`Expected >=2 observability seams, got ${observabilityCount}`);
source = source.replaceAll(
  observabilityAnchor,
  '          epistemicAccess,\n          selfMemoryRuntime,\n          responsePlan,',
);

const compactKdmAnchor = 'worldMemoryGuard, epistemicAccess, behaviorContract';
const compactCount = source.split(compactKdmAnchor).length - 1;
if (compactCount < 2) throw new Error(`Expected >=2 compact KDM seams, got ${compactCount}`);
source = source.replaceAll(
  compactKdmAnchor,
  'worldMemoryGuard, epistemicAccess, selfMemoryRuntime, behaviorContract',
);

if (!source.includes("resolveKairaAutobiographicalRecallRuntime")) throw new Error("Recall runtime import missing after patch");
if (!source.includes("enforceKairaAutobiographicalResponse")) throw new Error("Response guard import missing after patch");
if (!source.includes("${selfMemoryInstruction}")) throw new Error("System prompt self-memory instruction missing after patch");
if (!source.includes("candidateSelfMemoryGuard")) throw new Error("Post-enforcement self-memory guard missing after patch");

writeFileSync(path, source);
