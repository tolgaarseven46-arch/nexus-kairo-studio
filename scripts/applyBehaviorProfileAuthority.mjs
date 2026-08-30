import fs from 'node:fs';

function replaceRequired(text, from, to, label) {
  if (text.includes(from)) return text.replace(from, to);
  if (text.includes(to)) return text;
  throw new Error(`Missing patch target: ${label}`);
}

let client = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
client = replaceRequired(
  client,
  'import { computeBehaviorProfile, BehaviorLayerProfile } from "./droitBehaviorEngine";',
  'import type { BehaviorLayerProfile } from "./droitBehaviorEngine";',
  'client behavior profile import',
);
client = client.replace(
  '    const behaviorProfile = computeBehaviorProfile(runtimePersonality, userMessage);\n',
  '',
);
if (client.includes('computeBehaviorProfile(runtimePersonality, userMessage)')) {
  throw new Error('Parallel client behavior profile computation still present');
}
client = client.replace(
  'personality: runtimePersonality, behaviorProfile, personalityTendency:',
  'personality: runtimePersonality, personalityTendency:',
);
if (/const payload = \{[^\n]*personality: runtimePersonality, behaviorProfile,/u.test(client)) {
  throw new Error('Parallel client behavior profile still present in payload');
}
client = replaceRequired(
  client,
  '      const canonicalSemanticEvent = (data.kdm?.semanticEvent as SemanticEvent | undefined) ?? semanticEvent;\n      const semanticSource = languageUnderstanding.semanticSource;',
  '      const canonicalSemanticEvent = (data.kdm?.semanticEvent as SemanticEvent | undefined) ?? semanticEvent;\n      const authoritativeBehaviorProfile = data.kdm?.behaviorProfile as BehaviorLayerProfile | undefined;\n      if (!authoritativeBehaviorProfile) throw new Error("Authoritative behavior profile missing from server response");\n      const semanticSource = languageUnderstanding.semanticSource;',
  'read authoritative server behavior profile',
);
client = client.replace(
  '        temperamentAdjustedState,\n        behaviorProfile: authoritativeBehaviorProfile,',
  '        temperamentAdjustedState,',
);
client = replaceRequired(
  client,
  '      return { reply, profile: behaviorProfile, dynamicState:',
  '      return { reply, profile: authoritativeBehaviorProfile, dynamicState:',
  'return authoritative behavior profile',
);
fs.writeFileSync('src/services/droitChatService.ts', client);

let server = fs.readFileSync('server.ts', 'utf8');
const kdmNeedle = 'worldMemoryGuard, behaviorContract, responsePlan, conversationAuthority:';
const kdmReplacement = 'worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, conversationAuthority:';
server = server.replaceAll(kdmNeedle, kdmReplacement);
const authoritativeCount = server.split(kdmReplacement).length - 1;
if (authoritativeCount < 2) throw new Error(`Expected behaviorProfile in both server response paths, found ${authoritativeCount}`);
fs.writeFileSync('server.ts', server);

console.log('Authoritative behavior profile boundary applied');
