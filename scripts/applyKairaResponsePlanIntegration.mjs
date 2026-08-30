import fs from 'node:fs';

function replaceOrThrow(text, from, to, label) {
  if (!text.includes(from)) {
    if (text.includes(to)) return text;
    throw new Error(`Missing patch target: ${label}`);
  }
  return text.replace(from, to);
}

let server = fs.readFileSync('server.ts', 'utf8');
server = replaceOrThrow(
  server,
  'import { enforceBehaviorContract } from "./src/services/behaviorContractEnforcer";\n',
  'import { enforceBehaviorContract } from "./src/services/behaviorContractEnforcer";\nimport { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./src/services/kairaResponsePlan";\n',
  'server response-plan import',
);
server = replaceOrThrow(
  server,
  '      behaviorProfile = kdm.behaviorProfile,\n      speech = computeKairoSpeechIdentity(\n        authoritativePersonality,\n        kdm.nextDynamicState,\n        kdm.trace,\n      ),\n      enforcementRules = {',
  '      behaviorProfile = kdm.behaviorProfile,\n      speech = computeKairoSpeechIdentity(\n        authoritativePersonality,\n        kdm.nextDynamicState,\n        kdm.trace,\n      ),\n      responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech),\n      responsePlanInstruction = kairaResponsePlanInstruction(responsePlan),\n      enforcementRules = {',
  'server response plan construction',
);
server = replaceOrThrow(
  server,
  '        stateUserId,\n        dialogueDecision.move,\n      ),',
  '        stateUserId,\n        dialogueDecision.move,\n        responsePlan,\n      ),',
  'local verbalizer response plan',
);
server = replaceOrThrow(
  server,
  '${relationshipInstruction}\\n${behaviorContractInstruction(behaviorContract)}\\nKDM:',
  '${relationshipInstruction}\\n${behaviorContractInstruction(behaviorContract)}\\n${responsePlanInstruction}\\nKDM:',
  'AI response plan instruction',
);
server = server.replaceAll(
  '      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),',
  '      ...findKairaResponsePlanIssues(reply, responsePlan),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),',
);
server = server.replaceAll(
  '          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),',
  '          ...findKairaResponsePlanIssues(repairedReply, responsePlan),\n          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),',
);
server = server.replaceAll(
  '          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),',
  '          ...findKairaResponsePlanIssues(fallback, responsePlan),\n          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),',
);
server = replaceOrThrow(
  server,
  '        reply = enforced.reply,\n        consistency = validateKairoResponse(reply, kdm.trace),\n        postStart = now();',
  '        reply = enforced.reply,\n        localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan),\n        localBaseConsistency = validateKairoResponse(reply, kdm.trace),\n        consistency = {\n          ...localBaseConsistency,\n          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0,\n          score: Math.max(0, localBaseConsistency.score - localPlanIssues.length * 15),\n          issues: [...localBaseConsistency.issues, ...localPlanIssues],\n        },\n        postStart = now();',
  'local response plan validation',
);
server = server.replaceAll(
  '          worldMemoryGuard,\n        }),',
  '          worldMemoryGuard,\n          responsePlan,\n        }),',
);
server = server.replaceAll(
  '            worldMemoryGuard,\n            timings:',
  '            worldMemoryGuard,\n            responsePlan,\n            timings:',
);
server = server.replaceAll(
  'worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, conversationAuthority:',
  'worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, responsePlan, conversationAuthority:',
);
fs.writeFileSync('server.ts', server);

let persistence = fs.readFileSync('src/services/kdmPersistenceService.ts', 'utf8');
persistence = replaceOrThrow(
  persistence,
  'export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; speechIdentity?: unknown; worldStateAppraisal?: unknown; worldReasoningPolicy?: unknown; worldMemoryGuard?: unknown; createdAt?: string; }',
  'export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; speechIdentity?: unknown; worldStateAppraisal?: unknown; worldReasoningPolicy?: unknown; worldMemoryGuard?: unknown; responsePlan?: unknown; createdAt?: string; }',
  'KNT responsePlan type',
);
persistence = replaceOrThrow(
  persistence,
  '    worldMemoryGuard?: unknown;\n  };',
  '    worldMemoryGuard?: unknown;\n    responsePlan?: unknown;\n  };',
  'test-session responsePlan metadata type',
);
persistence = persistence.replaceAll(
  '      worldMemoryGuard: payload.metadata?.worldMemoryGuard,',
  '      worldMemoryGuard: payload.metadata?.worldMemoryGuard,\n      responsePlan: payload.metadata?.responsePlan,',
);
persistence = replaceOrThrow(
  persistence,
  '        lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard,\n      };',
  '        lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard,\n        lastResponsePlan: lastTurn?.metadata?.responsePlan,\n      };',
  'responsePlan hydration',
);
fs.writeFileSync('src/services/kdmPersistenceService.ts', persistence);

let nexus = fs.readFileSync('src/types/nexus.ts', 'utf8');
nexus = replaceOrThrow(
  nexus,
  '    worldMemoryGuard?: unknown;\n  };\n}\n\nexport interface TestSessionSummary',
  '    worldMemoryGuard?: unknown;\n    responsePlan?: unknown;\n  };\n}\n\nexport interface TestSessionSummary',
  'turn record responsePlan metadata type',
);
nexus = replaceOrThrow(
  nexus,
  '  lastWorldMemoryGuard?: unknown;\n}',
  '  lastWorldMemoryGuard?: unknown;\n  lastResponsePlan?: unknown;\n}',
  'restored responsePlan type',
);
fs.writeFileSync('src/types/nexus.ts', nexus);

let chat = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
chat = replaceOrThrow(
  chat,
  '  worldMemoryGuard?: unknown;\n}',
  '  worldMemoryGuard?: unknown;\n  responsePlan?: unknown;\n}',
  'chat responsePlan response type',
);
chat = replaceOrThrow(
  chat,
  'worldStateAppraisal: data.kdm?.worldStateAppraisal, worldReasoningPolicy: data.kdm?.worldReasoningPolicy, worldMemoryGuard: data.kdm?.worldMemoryGuard };',
  'worldStateAppraisal: data.kdm?.worldStateAppraisal, worldReasoningPolicy: data.kdm?.worldReasoningPolicy, worldMemoryGuard: data.kdm?.worldMemoryGuard, responsePlan: data.kdm?.responsePlan };',
  'chat responsePlan return',
);
fs.writeFileSync('src/services/droitChatService.ts', chat);

console.log('Kaira response plan integration applied');
