import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let client = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
client = once(
  client,
  'import { computeBehaviorProfile, BehaviorLayerProfile } from "./droitBehaviorEngine";',
  'import type { BehaviorLayerProfile } from "./droitBehaviorEngine";',
  'client behavior profile import',
);
client = once(
  client,
  '    const behaviorProfile = computeBehaviorProfile(runtimePersonality, userMessage);\n    const clientPrepMs = Math.round(performance.now() - prepStart);',
  '    const clientPrepMs = Math.round(performance.now() - prepStart);',
  'remove parallel client behavior profile',
);
client = once(
  client,
  'const payload = { sessionId: resolvedSessionId, userId, userName, userMessage, semanticEvent, character: characterInfo, personality: runtimePersonality, behaviorProfile, personalityTendency:',
  'const payload = { sessionId: resolvedSessionId, userId, userName, userMessage, semanticEvent, character: characterInfo, personality: runtimePersonality, personalityTendency:',
  'remove behavior profile from payload',
);
client = once(
  client,
  '      const canonicalSemanticEvent = (data.kdm?.semanticEvent as SemanticEvent | undefined) ?? semanticEvent;\n      const semanticSource = languageUnderstanding.semanticSource;',
  '      const canonicalSemanticEvent = (data.kdm?.semanticEvent as SemanticEvent | undefined) ?? semanticEvent;\n      const authoritativeBehaviorProfile = data.kdm?.behaviorProfile as BehaviorLayerProfile | undefined;\n      if (!authoritativeBehaviorProfile) throw new Error("Authoritative behavior profile missing from server response");\n      const semanticSource = languageUnderstanding.semanticSource;',
  'read authoritative server behavior profile',
);
client = once(
  client,
  '        rawDynamicStateBefore: dynamicState,\n        temperamentAdjustedState,',
  '        rawDynamicStateBefore: dynamicState,\n        temperamentAdjustedState,\n        behaviorProfile: authoritativeBehaviorProfile,',
  'audit authoritative behavior profile',
);
client = once(
  client,
  '      return { reply, profile: behaviorProfile, dynamicState:',
  '      return { reply, profile: authoritativeBehaviorProfile, dynamicState:',
  'return authoritative behavior profile',
);
fs.writeFileSync('src/services/droitChatService.ts', client);

let server = fs.readFileSync('server.ts', 'utf8');
const kdmNeedle = 'worldMemoryGuard, behaviorContract, responsePlan, conversationAuthority:';
const kdmReplacement = 'worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, conversationAuthority:';
const occurrences = server.split(kdmNeedle).length - 1;
if (occurrences === 0 && !server.includes(kdmReplacement)) throw new Error('Missing server kdm response patch target');
server = server.replaceAll(kdmNeedle, kdmReplacement);
const authoritativeCount = server.split(kdmReplacement).length - 1;
if (authoritativeCount < 2) throw new Error(`Expected behaviorProfile in both server response paths, found ${authoritativeCount}`);
fs.writeFileSync('server.ts', server);

console.log('Authoritative behavior profile boundary applied');
