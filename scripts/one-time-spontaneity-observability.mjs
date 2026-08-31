import { readFileSync, writeFileSync } from 'node:fs';

const serverPath = 'server.ts';
let server = readFileSync(serverPath, 'utf8');

const localKnt = `          providerUsed: "local_language",\n          speechIdentity: speech,\n          worldStateAppraisal,`;
const localKntWith = `          providerUsed: "local_language",\n          controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" },\n          speechIdentity: speech,\n          worldStateAppraisal,`;
if (!server.includes('providerUsed: "local_language",\n          controlledSpontaneity:')) {
  if (!server.includes(localKnt)) throw new Error('local KNT seam not found');
  server = server.replace(localKnt, localKntWith);
}

const aiKnt = `        providerUsed: activeAiProviderUsed,\n        speechIdentity: speech,\n        worldStateAppraisal,`;
const aiKntWith = `        providerUsed: activeAiProviderUsed,\n        controlledSpontaneity: spontaneityDecision,\n        speechIdentity: speech,\n        worldStateAppraisal,`;
if (!server.includes('providerUsed: activeAiProviderUsed,\n        controlledSpontaneity: spontaneityDecision')) {
  if (!server.includes(aiKnt)) throw new Error('AI KNT seam not found');
  server = server.replace(aiKnt, aiKntWith);
}

const localResponseKdm = `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan },`;
const localResponseWith = `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" } },`;
if ((server.match(/controlledSpontaneity: \{ mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" \}/g) ?? []).length < 3) {
  const first = server.indexOf(localResponseKdm);
  if (first < 0) throw new Error('local API response seam not found');
  server = server.slice(0, first) + server.slice(first).replace(localResponseKdm, localResponseWith);
}

const aiResponseNeedle = `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan },`;
const lastIndex = server.lastIndexOf(aiResponseNeedle);
if (!server.includes('responsePlan, controlledSpontaneity: spontaneityDecision }')) {
  if (lastIndex < 0) throw new Error('AI API response seam not found');
  server = server.slice(0, lastIndex) + server.slice(lastIndex).replace(aiResponseNeedle, `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, controlledSpontaneity: spontaneityDecision },`);
}
writeFileSync(serverPath, server);

const clientPath = 'src/services/droitChatService.ts';
let client = readFileSync(clientPath, 'utf8');
if (!client.includes('controlledSpontaneity?: unknown;')) {
  client = client.replace(
    `  responsePlan?: unknown;\n}`,
    `  responsePlan?: unknown;\n  controlledSpontaneity?: unknown;\n}`,
  );
}
if (!client.includes('controlledSpontaneity: data.kdm?.controlledSpontaneity')) {
  client = client.replace(
    `worldMemoryGuard: data.kdm?.worldMemoryGuard, responsePlan: data.kdm?.responsePlan };`,
    `worldMemoryGuard: data.kdm?.worldMemoryGuard, responsePlan: data.kdm?.responsePlan, controlledSpontaneity: data.kdm?.controlledSpontaneity };`,
  );
}
if (!client.includes('controlledSpontaneity: data.kdm?.controlledSpontaneity')) throw new Error('client response seam not found');
writeFileSync(clientPath, client);
