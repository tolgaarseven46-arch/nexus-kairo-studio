import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let server = fs.readFileSync('server.ts', 'utf8');
if (!server.includes('from "./src/services/kairaResponsePlan"')) {
  server = replaceOnce(
    server,
    'import { enforceBehaviorContract } from "./src/services/behaviorContractEnforcer";\n',
    'import { enforceBehaviorContract } from "./src/services/behaviorContractEnforcer";\nimport { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./src/services/kairaResponsePlan";\n',
    'server response-plan import',
  );
}
if (!server.includes('responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech)')) {
  server = replaceOnce(
    server,
    '      behaviorProfile = kdm.behaviorProfile,\n      speech = computeKairoSpeechIdentity(\n        authoritativePersonality,\n        kdm.nextDynamicState,\n        kdm.trace,\n      ),\n      enforcementRules = {',
    '      behaviorProfile = kdm.behaviorProfile,\n      speech = computeKairoSpeechIdentity(\n        authoritativePersonality,\n        kdm.nextDynamicState,\n        kdm.trace,\n      ),\n      responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech),\n      responsePlanInstruction = kairaResponsePlanInstruction(responsePlan),\n      enforcementRules = {',
    'server response plan construction',
  );
}
if (!/dialogueDecision\.move,\s*responsePlan,\s*\)/u.test(server)) {
  server = replaceOnce(
    server,
    '        stateUserId,\n        dialogueDecision.move,\n      ),',
    '        stateUserId,\n        dialogueDecision.move,\n        responsePlan,\n      ),',
    'local verbalizer response plan',
  );
}
if (!server.includes('${responsePlanInstruction}\\nKDM:')) {
  server = replaceOnce(
    server,
    '${relationshipInstruction}\\n${behaviorContractInstruction(behaviorContract)}\\nKDM:',
    '${relationshipInstruction}\\n${behaviorContractInstruction(behaviorContract)}\\n${responsePlanInstruction}\\nKDM:',
    'AI response plan instruction',
  );
}

if (!server.includes('localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan)')) {
  server = replaceOnce(
    server,
    '        reply = enforced.reply,\n        consistency = validateKairoResponse(reply, kdm.trace),\n        postStart = now();',
    '        reply = enforced.reply,\n        localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan),\n        localBaseConsistency = validateKairoResponse(reply, kdm.trace),\n        consistency = {\n          ...localBaseConsistency,\n          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0,\n          score: Math.max(0, localBaseConsistency.score - localPlanIssues.length * 15),\n          issues: [...localBaseConsistency.issues, ...localPlanIssues],\n        },\n        postStart = now();',
    'local response plan validation',
  );
}

if (!server.includes('...findKairaResponsePlanIssues(reply, responsePlan),')) {
  server = server.replace(
    '      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),',
    '      ...findKairaResponsePlanIssues(reply, responsePlan),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),',
  );
}
if (!server.includes('...findKairaResponsePlanIssues(repairedReply, responsePlan),')) {
  server = server.replace(
    '          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),',
    '          ...findKairaResponsePlanIssues(repairedReply, responsePlan),\n          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),',
  );
}
if (!server.includes('...findKairaResponsePlanIssues(fallback, responsePlan),')) {
  server = server.replace(
    '          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),',
    '          ...findKairaResponsePlanIssues(fallback, responsePlan),\n          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),',
  );
}

// Complete AI-path per-turn observability without duplicating already-integrated local fields.
const aiKntNeedle = `        speechIdentity: speech,\n        worldStateAppraisal,\n        worldReasoningPolicy,\n        worldMemoryGuard,\n      }),\n      saveTestSessionTurn({`;
const aiKntReplacement = `        speechIdentity: speech,\n        worldStateAppraisal,\n        worldReasoningPolicy,\n        worldMemoryGuard,\n        responsePlan,\n      }),\n      saveTestSessionTurn({`;
if (server.includes(aiKntNeedle)) server = server.replace(aiKntNeedle, aiKntReplacement);

const aiMetadataNeedle = `          worldStateAppraisal,\n          worldReasoningPolicy,\n          worldMemoryGuard,\n          timings: { memoryMs, kdmMs, aiMs },`;
const aiMetadataReplacement = `          worldStateAppraisal,\n          worldReasoningPolicy,\n          worldMemoryGuard,\n          responsePlan,\n          timings: { memoryMs, kdmMs, aiMs },`;
if (server.includes(aiMetadataNeedle)) server = server.replace(aiMetadataNeedle, aiMetadataReplacement);

if (!server.includes('const finalPlanIssues = findKairaResponsePlanIssues(reply, responsePlan);')) {
  server = replaceOnce(
    server,
    '    const baseConsistency = validateKairoResponse(reply, kdm.trace);\n    const consistency = {\n      ...baseConsistency,\n      accepted: baseConsistency.accepted && groundingIssues.length === 0,\n      score: Math.max(0, baseConsistency.score - groundingIssues.length * 15),\n      issues: [...baseConsistency.issues, ...groundingIssues],\n      warnings: enforced.reasons,\n    };',
    '    const baseConsistency = validateKairoResponse(reply, kdm.trace);\n    const finalPlanIssues = findKairaResponsePlanIssues(reply, responsePlan);\n    const finalIssues = [...new Set([...groundingIssues, ...finalPlanIssues])];\n    const consistency = {\n      ...baseConsistency,\n      accepted: baseConsistency.accepted && finalIssues.length === 0,\n      score: Math.max(0, baseConsistency.score - finalIssues.length * 15),\n      issues: [...baseConsistency.issues, ...finalIssues],\n      warnings: enforced.reasons,\n    };',
    'AI final response plan validation',
  );
}

if (!server.includes('worldMemoryGuard, behaviorContract, responsePlan, conversationAuthority:')) {
  server = server.replaceAll(
    'worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, conversationAuthority:',
    'worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, responsePlan, conversationAuthority:',
  );
}
fs.writeFileSync('server.ts', server);

let persistence = fs.readFileSync('src/services/kdmPersistenceService.ts', 'utf8');
if (!persistence.includes('worldMemoryGuard?: unknown; responsePlan?: unknown; createdAt?: string;')) {
  persistence = replaceOnce(
    persistence,
    'worldMemoryGuard?: unknown; createdAt?: string;',
    'worldMemoryGuard?: unknown; responsePlan?: unknown; createdAt?: string;',
    'KNT responsePlan type',
  );
}
if (!/worldMemoryGuard\?: unknown;\s*responsePlan\?: unknown;\s*\};/u.test(persistence)) {
  persistence = replaceOnce(
    persistence,
    '    worldMemoryGuard?: unknown;\n  };',
    '    worldMemoryGuard?: unknown;\n    responsePlan?: unknown;\n  };',
    'test-session responsePlan metadata type',
  );
}
if (!persistence.includes('responsePlan: payload.metadata?.responsePlan')) {
  persistence = persistence.replace(
    '      worldMemoryGuard: payload.metadata?.worldMemoryGuard,',
    '      worldMemoryGuard: payload.metadata?.worldMemoryGuard,\n      responsePlan: payload.metadata?.responsePlan,',
  );
}
if (!persistence.includes('lastResponsePlan: lastTurn?.metadata?.responsePlan')) {
  persistence = replaceOnce(
    persistence,
    '        lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard,\n      };',
    '        lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard,\n        lastResponsePlan: lastTurn?.metadata?.responsePlan,\n      };',
    'responsePlan hydration',
  );
}
fs.writeFileSync('src/services/kdmPersistenceService.ts', persistence);

let nexus = fs.readFileSync('src/types/nexus.ts', 'utf8');
if (!/worldMemoryGuard\?: unknown;\s*responsePlan\?: unknown;/u.test(nexus)) {
  nexus = replaceOnce(
    nexus,
    '    worldMemoryGuard?: unknown;\n  };\n}\n\nexport interface TestSessionSummary',
    '    worldMemoryGuard?: unknown;\n    responsePlan?: unknown;\n  };\n}\n\nexport interface TestSessionSummary',
    'turn record responsePlan metadata type',
  );
}
if (!nexus.includes('lastResponsePlan?: unknown;')) {
  nexus = replaceOnce(
    nexus,
    '  lastWorldMemoryGuard?: unknown;\n}',
    '  lastWorldMemoryGuard?: unknown;\n  lastResponsePlan?: unknown;\n}',
    'restored responsePlan type',
  );
}
fs.writeFileSync('src/types/nexus.ts', nexus);

let chat = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
if (!chat.includes('  responsePlan?: unknown;')) {
  chat = replaceOnce(
    chat,
    '  worldMemoryGuard?: unknown;\n}',
    '  worldMemoryGuard?: unknown;\n  responsePlan?: unknown;\n}',
    'chat responsePlan response type',
  );
}
if (!chat.includes('responsePlan: data.kdm?.responsePlan')) {
  chat = replaceOnce(
    chat,
    'worldStateAppraisal: data.kdm?.worldStateAppraisal, worldReasoningPolicy: data.kdm?.worldReasoningPolicy, worldMemoryGuard: data.kdm?.worldMemoryGuard };',
    'worldStateAppraisal: data.kdm?.worldStateAppraisal, worldReasoningPolicy: data.kdm?.worldReasoningPolicy, worldMemoryGuard: data.kdm?.worldMemoryGuard, responsePlan: data.kdm?.responsePlan };',
    'chat responsePlan return',
  );
}
fs.writeFileSync('src/services/droitChatService.ts', chat);

console.log('Kaira response plan integration applied idempotently');
