const fs = require('fs');
const path = 'server.ts';
let s = fs.readFileSync(path, 'utf8');
function once(needle, replacement, label) {
  const count = s.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, got ${count}`);
  s = s.replace(needle, replacement);
}
function regexAll(pattern, replacement, expected, label) {
  const matches = [...s.matchAll(pattern)];
  if (matches.length !== expected) throw new Error(`${label}: expected ${expected} occurrences, got ${matches.length}`);
  s = s.replace(pattern, replacement);
}

once(
  'import { saveWorldEventObservation, loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";',
  'import { loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";\nimport { persistWorldEventAndMaybeConsolidateLivedMemory } from "./src/services/kairaLivedMemoryRuntime";',
  'world import',
);

regexAll(
  /\s*kairaPolicy\.persistentWorldModel \? saveWorldEventObservation\(\{\n\s*userId,\n\s*kairaInstanceId: kairaInstance\.instanceId,\n\s*sessionId,\n\s*speakerName: userName,\n\s*event: languageUnderstanding\.worldEvent,\n\s*\}\) : Promise\.resolve\(\),\n/g,
  '\n',
  2,
  'direct world write',
);

regexAll(
  /^(\s*)const postStart = now\(\);\n\1let savedTurnId = "";\n\1await Promise\.allSettled\(\[/gm,
  (_, indent) => `${indent}const postStart = now();\n${indent}const livedMemoryRuntime = await persistWorldEventAndMaybeConsolidateLivedMemory({\n${indent}  userId,\n${indent}  instance: kairaInstance,\n${indent}  sessionId,\n${indent}  speakerName: userName,\n${indent}  event: languageUnderstanding.worldEvent,\n${indent}  dynamicStateAfter: kdm.nextDynamicState,\n${indent}});\n${indent}let savedTurnId = "";\n${indent}await Promise.allSettled([`,
  2,
  'persistence start',
);

once(
  '          epistemicAccess,\n          selfMemoryRuntime,\n          responsePlan,',
  '          epistemicAccess,\n          selfMemoryRuntime,\n          livedMemoryRuntime,\n          responsePlan,',
  'local KNT metadata',
);
once(
  '        epistemicAccess,\n        responsePlan,',
  '        epistemicAccess,\n        selfMemoryRuntime,\n        livedMemoryRuntime,\n        responsePlan,',
  'AI KNT metadata',
);
once(
  '            epistemicAccess,\n            responsePlan,',
  '            epistemicAccess,\n            selfMemoryRuntime,\n            livedMemoryRuntime,\n            responsePlan,',
  'local turn metadata',
);
once(
  '          epistemicAccess,\n          selfMemoryRuntime,\n          responsePlan,',
  '          epistemicAccess,\n          selfMemoryRuntime,\n          livedMemoryRuntime,\n          responsePlan,',
  'AI turn metadata',
);

regexAll(
  /worldMemoryGuard, epistemicAccess, selfMemoryRuntime, behaviorContract/g,
  'worldMemoryGuard, epistemicAccess, selfMemoryRuntime, livedMemoryRuntime, behaviorContract',
  2,
  'api kdm payload',
);

if (s.includes('saveWorldEventObservation({')) throw new Error('direct world persistence seam remains');
if ((s.match(/persistWorldEventAndMaybeConsolidateLivedMemory\(\{/g) || []).length !== 2) throw new Error('coordinator must be used in both response paths');
if ((s.match(/livedMemoryRuntime/g) || []).length < 7) throw new Error('lived memory observability wiring incomplete');
fs.writeFileSync(path, s);
