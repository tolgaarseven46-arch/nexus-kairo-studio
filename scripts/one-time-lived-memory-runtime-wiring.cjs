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
function patchObjectCalls(callName, expected, transform) {
  let cursor = 0;
  let count = 0;
  while (true) {
    const start = s.indexOf(`${callName}({`, cursor);
    if (start < 0) break;
    const open = s.indexOf('{', start);
    let depth = 0;
    let close = -1;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') {
        depth--;
        if (depth === 0) { close = i; break; }
      }
    }
    if (close < 0) throw new Error(`${callName}: object close not found`);
    const original = s.slice(open + 1, close);
    const next = transform(original, count);
    s = s.slice(0, open + 1) + next + s.slice(close);
    cursor = open + 1 + next.length + 1;
    count++;
  }
  if (count !== expected) throw new Error(`${callName}: expected ${expected} calls, got ${count}`);
}
function normalizeMemoryObservability(body) {
  body = body.replace(/\n(\s*)selfMemoryRuntime,\n\1livedMemoryRuntime,/g, '');
  body = body.replace(/\n(\s*)selfMemoryRuntime,/g, '');
  body = body.replace(/\n(\s*)livedMemoryRuntime,/g, '');
  const match = body.match(/\n(\s*)epistemicAccess,/);
  if (!match) throw new Error('epistemicAccess anchor missing inside persistence call');
  const indent = match[1];
  return body.replace(
    `\n${indent}epistemicAccess,`,
    `\n${indent}epistemicAccess,\n${indent}selfMemoryRuntime,\n${indent}livedMemoryRuntime,`,
  );
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

patchObjectCalls('saveKntTrace', 2, normalizeMemoryObservability);
patchObjectCalls('saveTestSessionTurn', 2, normalizeMemoryObservability);

regexAll(
  /worldMemoryGuard, epistemicAccess, selfMemoryRuntime, behaviorContract/g,
  'worldMemoryGuard, epistemicAccess, selfMemoryRuntime, livedMemoryRuntime, behaviorContract',
  2,
  'api kdm payload',
);

if (s.includes('saveWorldEventObservation({')) throw new Error('direct world persistence seam remains');
if ((s.match(/persistWorldEventAndMaybeConsolidateLivedMemory\(\{/g) || []).length !== 2) throw new Error('coordinator must be used in both response paths');
if ((s.match(/livedMemoryRuntime/g) || []).length < 9) throw new Error('lived memory observability wiring incomplete');
fs.writeFileSync(path, s);
