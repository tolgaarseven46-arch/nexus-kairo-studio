import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let client = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
client = once(
  client,
  'import { integrateBehaviorLayers } from "./behaviorIntegrationEngine";\n',
  'import { integrateBehaviorLayers } from "./behaviorIntegrationEngine";\nimport { createClientBehaviorPolicy } from "./behaviorPolicyInput";\n',
  'client behavior policy import',
);
client = once(
  client,
  '    const runtimePersonality = integrationRuntime.personality;\n    const clientPrepMs = Math.round(performance.now() - prepStart);',
  '    const runtimePersonality = integrationRuntime.personality;\n    const behaviorPolicy = createClientBehaviorPolicy(\n      integrationRuntime.decision,\n      integrationRuntime.pressures,\n    );\n    const clientPrepMs = Math.round(performance.now() - prepStart);',
  'client behavior policy creation',
);
client = once(
  client,
  'behaviorDecision: integrationRuntime.decision, behaviorPressures: integrationRuntime.pressures, dynamicState:',
  'behaviorPolicy, dynamicState:',
  'client behavior policy payload',
);
fs.writeFileSync('src/services/droitChatService.ts', client);

let server = fs.readFileSync('server.ts', 'utf8');
server = once(
  server,
  'import { analyzeKdmInteraction } from "./src/services/kdmConsistencyEngine";\n',
  'import { analyzeKdmInteraction } from "./src/services/kdmConsistencyEngine";\nimport { normalizeBehaviorPolicyInput } from "./src/services/behaviorPolicyInput";\n',
  'server behavior policy import',
);
server = once(
  server,
  '      semanticEvent: incomingSemanticEvent,\n      sessionId: incomingSessionId,',
  '      semanticEvent: incomingSemanticEvent,\n      behaviorPolicy: incomingBehaviorPolicy,\n      sessionId: incomingSessionId,',
  'server behavior policy request input',
);
server = once(
  server,
  '      safePersonality = personality as DroitPersonalityTraits,\n      kdmStart = now(),',
  '      safePersonality = personality as DroitPersonalityTraits,\n      behaviorPolicy = normalizeBehaviorPolicyInput(incomingBehaviorPolicy),\n      kdmStart = now(),',
  'server behavior policy normalize',
);
server = once(
  server,
  '        effective,\n        canonicalSemantic.event,\n      ),',
  '        effective,\n        canonicalSemantic.event,\n        behaviorPolicy,\n      ),',
  'server behavior policy KDM handoff',
);
fs.writeFileSync('server.ts', server);

let kdm = fs.readFileSync('src/services/kdmConsistencyEngine.ts', 'utf8');
kdm = once(
  kdm,
  'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";\n',
  'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";\nimport type { BehaviorPolicyInput } from "./behaviorPolicyInput";\n',
  'KDM behavior policy import',
);

const runtimeTraitBlock = `function runtimeTrait(\n  p: DroitPersonalityTraits | null | undefined,\n  key: string,\n  fallback: number,\n) {\n  const value = p?.[key];\n  return typeof value === "number" && Number.isFinite(value)\n    ? clamp(value)\n    : fallback;\n}\n\n`;
if (kdm.includes(runtimeTraitBlock)) kdm = kdm.replace(runtimeTraitBlock, '');

const oldIntegratedStart = `function applyIntegratedRuntimeDecision(\n  profile: BehaviorLayerProfile,\n  personality?: DroitPersonalityTraits | null,\n): BehaviorLayerProfile {\n  const continueConversation = runtimeTrait(personality, "runtimeContinueConversation", 100) >= 50;\n  const humorAllowed = runtimeTrait(personality, "runtimeHumorAllowed", 100) >= 50;\n  const askQuestion = runtimeTrait(personality, "runtimeAskQuestion", 100) >= 50;\n  const acknowledgeComplaint = runtimeTrait(personality, "runtimeAcknowledgeComplaint", 0) >= 50;\n  const repairAllowed = runtimeTrait(personality, "runtimeRepairAllowed", 100) >= 50;\n  const stance = runtimeTrait(personality, "runtimeStance", 25);\n  const responseLength = runtimeTrait(personality, "runtimeResponseLength", 50);\n  const directness = runtimeTrait(personality, "runtimeDirectness", 50);\n  const distance = runtimeTrait(personality, "runtimeDistance", 0);\n  const priority = runtimeTrait(personality, "runtimePriority", 20);`;
const newIntegratedStart = `function behaviorPolicyStanceCode(value?: BehaviorPolicyInput["decision"]["stance"]): number {\n  if (value === "warm") return 0;\n  if (value === "firm") return 50;\n  if (value === "distant") return 75;\n  if (value === "disengage") return 100;\n  return 25;\n}\n\nfunction behaviorPolicyLengthCode(value?: BehaviorPolicyInput["decision"]["responseLength"]): number {\n  if (value === "short") return 25;\n  if (value === "long") return 75;\n  return 50;\n}\n\nfunction behaviorPolicyPriorityCode(value?: BehaviorPolicyInput["decision"]["priority"]): number {\n  if (value === "boundary") return 100;\n  if (value === "values") return 82;\n  if (value === "relationship") return 65;\n  if (value === "goal") return 50;\n  if (value === "preference") return 35;\n  return 20;\n}\n\nfunction applyIntegratedBehaviorPolicy(\n  profile: BehaviorLayerProfile,\n  behaviorPolicy?: BehaviorPolicyInput | null,\n): BehaviorLayerProfile {\n  const decision = behaviorPolicy?.decision;\n  const continueConversation = decision?.continueConversation ?? true;\n  const humorAllowed = decision?.humorAllowed ?? true;\n  const askQuestion = decision?.askQuestion ?? true;\n  const acknowledgeComplaint = decision?.acknowledgeComplaint ?? false;\n  const repairAllowed = decision?.repairAllowed ?? true;\n  const stance = behaviorPolicyStanceCode(decision?.stance);\n  const responseLength = behaviorPolicyLengthCode(decision?.responseLength);\n  const directness = Math.round((decision?.directness ?? 0.5) * 100);\n  const distance = Math.round((decision?.distance ?? 0) * 100);\n  const priority = behaviorPolicyPriorityCode(decision?.priority);`;
kdm = once(kdm, oldIntegratedStart, newIntegratedStart, 'KDM explicit integrated policy start');

kdm = kdm.replace('runtimeDecision: {', 'behaviorPolicyDecision: {');
kdm = kdm.replace('`${profile.dominantSummary} · Entegre karar`', '`${profile.dominantSummary} · Entegre policy`');

kdm = once(
  kdm,
  '  canonicalSemanticEvent?: SemanticEvent | null,\n): KdmAnalysisResult {',
  '  canonicalSemanticEvent?: SemanticEvent | null,\n  behaviorPolicy?: BehaviorPolicyInput | null,\n): KdmAnalysisResult {',
  'KDM behavior policy signature',
);

const oldRelationPolicy = `  const priorConversationState = relationship.conversationState ?? "active";\n  const priorRepairAttempts = Math.max(0, relationship.repairAttempts ?? 0);\n  const runtimeContinueConversation = runtimeTrait(personality, "runtimeContinueConversation", 100) >= 50;\n  const runtimeStance = runtimeTrait(personality, "runtimeStance", 25);\n  const runtimePriority = runtimeTrait(personality, "runtimePriority", 20);\n  const runtimeRepairSignal = runtimeTrait(personality, "runtimeRepairSignal", 0) >= 50;\n  const requestedDisengage = !runtimeContinueConversation && runtimeStance >= 90 && runtimePriority >= 80;`;
const newRelationPolicy = `  const priorConversationState = relationship.conversationState ?? "active";\n  const priorRepairAttempts = Math.max(0, relationship.repairAttempts ?? 0);\n  const integratedDecision = behaviorPolicy?.decision;\n  const integratedPriority = behaviorPolicyPriorityCode(integratedDecision?.priority);\n  const integratedStance = behaviorPolicyStanceCode(integratedDecision?.stance);\n  const requestedDisengage =\n    integratedDecision?.continueConversation === false &&\n    integratedDecision.stance === "disengage" &&\n    integratedPriority >= 80;`;
kdm = once(kdm, oldRelationPolicy, newRelationPolicy, 'KDM relationship policy input');

kdm = once(
  kdm,
  '  const repairSignal = apology || semanticEvent.repairAttempt || runtimeRepairSignal;',
  '  const repairSignal = apology || semanticEvent.repairAttempt;',
  'remove hidden runtime repair signal',
);

kdm = once(
  kdm,
  '  const finalBehaviorProfile = applyIntegratedRuntimeDecision(relationshipBehaviorProfile, personality);\n  const targetNote = rawKind === "negative" ? ` Negatif hedef=${negativeTarget}.` : "";\n  const integratedPriority = runtimeTrait(personality, "runtimePriority", 20);\n  const integratedStance = runtimeTrait(personality, "runtimeStance", 25);',
  '  const finalBehaviorProfile = applyIntegratedBehaviorPolicy(relationshipBehaviorProfile, behaviorPolicy);\n  const targetNote = rawKind === "negative" ? ` Negatif hedef=${negativeTarget}.` : "";',
  'KDM final behavior policy application',
);

kdm = once(
  kdm,
  '      explanation: integratedPriority >= 60\n        ? `8 katmanlı entegrasyon kararı KDM üzerinde zorlandı; öncelik=${integratedPriority}, duruş=${integratedStance}, ton=${finalBehaviorProfile.tone}.`',
  '      explanation: behaviorPolicy && integratedPriority >= 60\n        ? `Açık ${behaviorPolicy.schemaVersion} girdisi KDM profilinde değerlendirildi; kaynak=${behaviorPolicy.source}, öncelik=${integratedDecision?.priority ?? "expression"}, duruş=${integratedDecision?.stance ?? "neutral"}, ton=${finalBehaviorProfile.tone}.`',
  'KDM explicit policy trace wording',
);

const remainingRuntimeTraits = (kdm.match(/runtimeTrait\(/g) || []).length;
if (remainingRuntimeTraits > 0) throw new Error(`Hidden runtimeTrait decision reads remain in KDM: ${remainingRuntimeTraits}`);
if (kdm.includes('applyIntegratedRuntimeDecision')) throw new Error('Legacy integrated runtime decision function remains');

fs.writeFileSync('src/services/kdmConsistencyEngine.ts', kdm);
console.log('Explicit behavior-policy@1 boundary applied');
