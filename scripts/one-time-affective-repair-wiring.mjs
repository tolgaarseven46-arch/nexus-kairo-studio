import { readFileSync, writeFileSync } from 'node:fs';

const consistencyPath = 'src/services/kairoResponseConsistency.ts';
let consistency = readFileSync(consistencyPath, 'utf8');
const validateMarker = '/** Deterministic KDM post-generation consistency gate. */';
if (!consistency.includes('QUALITATIVE_REACTION_RESPONSE_ISSUE')) {
  const helper = `export const QUALITATIVE_REACTION_RESPONSE_ISSUE = 'Yanıt nitel tepki durumuyla çelişen sosyal yakınlık/onarım tonu içeriyor';\n\nexport function findKairoAffectiveResponseIssues(reply: string, trace: ReasoningTrace): string[] {\n  const result = validateKairoResponse(reply, trace);\n  return result.checks.qualitativeReactionTone ? [] : [QUALITATIVE_REACTION_RESPONSE_ISSUE];\n}\n\n`;
  if (!consistency.includes(validateMarker)) throw new Error('validate marker not found');
  consistency = consistency.replace(validateMarker, helper + validateMarker);
}
consistency = consistency.replace(
  "issues.push('Yanıt nitel tepki durumuyla çelişen sosyal yakınlık/onarım tonu içeriyor')",
  'issues.push(QUALITATIVE_REACTION_RESPONSE_ISSUE)',
);
writeFileSync(consistencyPath, consistency);

const serverPath = 'server.ts';
let server = readFileSync(serverPath, 'utf8');
server = server.replace(
  `  enforceKairoResponse,\n  validateKairoResponse,`,
  `  enforceKairoResponse,\n  findKairoAffectiveResponseIssues,\n  validateKairoResponse,`,
);
const planWorld = `      ...findKairaResponsePlanIssues(reply, responsePlan),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),`;
const planWorldWithAffective = `      ...findKairaResponsePlanIssues(reply, responsePlan),\n      ...findKairoAffectiveResponseIssues(reply, kdm.trace),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),`;
server = server.replaceAll(planWorld, planWorldWithAffective);
const compactPlanWorld = `        ...findKairaResponsePlanIssues(reply, responsePlan),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),`;
const compactPlanWorldWithAffective = `        ...findKairaResponsePlanIssues(reply, responsePlan),\n        ...findKairoAffectiveResponseIssues(reply, kdm.trace),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),`;
server = server.replaceAll(compactPlanWorld, compactPlanWorldWithAffective);
if (!server.includes('findKairoAffectiveResponseIssues(reply, kdm.trace)')) throw new Error('affective repair wiring not inserted');
writeFileSync(serverPath, server);
