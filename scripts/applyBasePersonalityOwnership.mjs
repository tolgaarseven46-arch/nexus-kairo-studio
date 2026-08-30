import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let client = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
client = once(
  client,
  'character: characterInfo, personality: runtimePersonality, personalityTendency:',
  'character: characterInfo, personality, responsePersonality: runtimePersonality, personalityTendency:',
  'client base and response personality payload split',
);
if (client.includes('personality: runtimePersonality')) {
  throw new Error('Client still aliases per-turn response personality as base personality');
}
fs.writeFileSync('src/services/droitChatService.ts', client);

let server = fs.readFileSync('server.ts', 'utf8');
server = once(
  server,
  '      personality = {},\n      history = [],',
  '      personality = {},\n      responsePersonality: incomingResponsePersonality,\n      history = [],',
  'server response personality request field',
);
server = once(
  server,
  '      safePersonality = personality as DroitPersonalityTraits,\n      behaviorPolicy = normalizeBehaviorPolicyInput(incomingBehaviorPolicy),',
  '      basePersonality = personality as DroitPersonalityTraits,\n      responsePersonality = (incomingResponsePersonality || personality) as DroitPersonalityTraits,\n      behaviorPolicy = normalizeBehaviorPolicyInput(incomingBehaviorPolicy),',
  'server base response personality split',
);
server = once(
  server,
  '        safePersonality,\n        effective,',
  '        basePersonality,\n        effective,',
  'KDM base personality ownership',
);
server = once(
  server,
  '      conversationAuthority = applyConversationStateAuthority(safePersonality, kdm.nextDynamicState),',
  '      conversationAuthority = applyConversationStateAuthority(responsePersonality, kdm.nextDynamicState),',
  'response overlay after KDM',
);
if (server.includes('safePersonality')) {
  throw new Error('Legacy ambiguous safePersonality alias remains in server');
}
fs.writeFileSync('server.ts', server);

console.log('Base personality and per-turn response personality ownership split applied');
