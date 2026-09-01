const fs = require('fs');
const path = 'server.ts';
let s = fs.readFileSync(path, 'utf8');
function once(needle, replacement, label) {
  const count = s.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, got ${count}`);
  s = s.replace(needle, replacement);
}
function all(needle, replacement, expected, label) {
  const count = s.split(needle).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrences, got ${count}`);
  s = s.split(needle).join(replacement);
}

once(
  'import { saveWorldEventObservation, loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";',
  'import { loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";\nimport { persistWorldEventAndMaybeConsolidateLivedMemory } from "./src/services/kairaLivedMemoryRuntime";',
  'world import',
);

const worldWrite = `      kairaPolicy.persistentWorldModel ? saveWorldEventObservation({\n        userId,\n        kairaInstanceId: kairaInstance.instanceId,\n        sessionId,\n        speakerName: userName,\n        event: languageUnderstanding.worldEvent,\n      }) : Promise.resolve(),\n`;
all(worldWrite, '', 2, 'direct world write');

const persistenceStart = `    const postStart = now();\n    let savedTurnId = "";\n    await Promise.allSettled([`;
const withConsolidation = `    const postStart = now();\n    const livedMemoryRuntime = await persistWorldEventAndMaybeConsolidateLivedMemory({\n      userId,\n      instance: kairaInstance,\n      sessionId,\n      speakerName: userName,\n      event: languageUnderstanding.worldEvent,\n      dynamicStateAfter: kdm.nextDynamicState,\n    });\n    let savedTurnId = "";\n    await Promise.allSettled([`;
all(persistenceStart, withConsolidation, 2, 'persistence start');

all(
  '          selfMemoryRuntime,\n          responsePlan,',
  '          selfMemoryRuntime,\n          livedMemoryRuntime,\n          responsePlan,',
  2,
  'KNT metadata',
);

all(
  '            selfMemoryRuntime,\n            responsePlan,',
  '            selfMemoryRuntime,\n            livedMemoryRuntime,\n            responsePlan,',
  2,
  'turn metadata',
);

all(
  'worldMemoryGuard, epistemicAccess, selfMemoryRuntime, behaviorContract',
  'worldMemoryGuard, epistemicAccess, selfMemoryRuntime, livedMemoryRuntime, behaviorContract',
  2,
  'api kdm payload',
);

if (s.includes('saveWorldEventObservation({')) throw new Error('direct world persistence seam remains');
if ((s.match(/persistWorldEventAndMaybeConsolidateLivedMemory\(\{/g) || []).length !== 2) throw new Error('coordinator must be used in both response paths');
fs.writeFileSync(path, s);
