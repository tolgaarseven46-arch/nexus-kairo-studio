import { readFileSync, writeFileSync } from 'node:fs';

const path = 'server.ts';
let source = readFileSync(path, 'utf8');

const importNeedle = `import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./src/services/kairaResponsePlan";`;
const importReplacement = `${importNeedle}\nimport {\n  decideKairaControlledSpontaneity,\n  kairaControlledSpontaneityInstruction,\n} from "./src/services/kairaControlledSpontaneity";`;
if (!source.includes('decideKairaControlledSpontaneity,')) {
  if (!source.includes(importNeedle)) throw new Error('response plan import not found');
  source = source.replace(importNeedle, importReplacement);
}

const planNeedle = `      responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech),\n      responsePlanInstruction = kairaResponsePlanInstruction(responsePlan),\n      dialogueDecisionInstruction = buildDialogueDecisionInstruction(`;
const planReplacement = `      responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech),\n      responsePlanInstruction = kairaResponsePlanInstruction(responsePlan),\n      spontaneityDecision = decideKairaControlledSpontaneity({\n        responsePlan,\n        dynamicState: kdm.nextDynamicState,\n        history: cleanHistory,\n      }),\n      spontaneityInstruction = kairaControlledSpontaneityInstruction(spontaneityDecision, responsePlan),\n      dialogueDecisionInstruction = buildDialogueDecisionInstruction(`;
if (!source.includes('spontaneityDecision = decideKairaControlledSpontaneity')) {
  if (!source.includes(planNeedle)) throw new Error('response plan seam not found');
  source = source.replace(planNeedle, planReplacement);
}

const promptNeedle = `\${behaviorContractInstruction(behaviorContract)}\\\n\${responsePlanInstruction}\\\nKDM:`;
const promptReplacement = `\${behaviorContractInstruction(behaviorContract)}\\\n\${responsePlanInstruction}\\\n\${spontaneityInstruction}\\\nKDM:`;
if (!source.includes('${spontaneityInstruction}\\')) {
  if (!source.includes(promptNeedle)) throw new Error('system prompt seam not found');
  source = source.replace(promptNeedle, promptReplacement);
}

const localMetadataNeedle = `          metadata: {\n            providerUsed: "local_language",\n            speechIdentity: speech,`;
const localMetadataReplacement = `          metadata: {\n            providerUsed: "local_language",\n            controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" },\n            speechIdentity: speech,`;
if (!source.includes('reason: "local_language_short_circuit"')) {
  if (!source.includes(localMetadataNeedle)) throw new Error('local metadata seam not found');
  source = source.replace(localMetadataNeedle, localMetadataReplacement);
}

const aiMetadataNeedle = `        metadata: {\n          providerUsed: activeAiProviderUsed,\n          speechIdentity: speech,`;
const aiMetadataReplacement = `        metadata: {\n          providerUsed: activeAiProviderUsed,\n          controlledSpontaneity: spontaneityDecision,\n          speechIdentity: speech,`;
if (!source.includes('controlledSpontaneity: spontaneityDecision')) {
  if (!source.includes(aiMetadataNeedle)) throw new Error('AI metadata seam not found');
  source = source.replace(aiMetadataNeedle, aiMetadataReplacement);
}

writeFileSync(path, source);
