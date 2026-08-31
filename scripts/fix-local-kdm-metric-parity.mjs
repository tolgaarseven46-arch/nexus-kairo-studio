import { readFileSync, writeFileSync } from 'node:fs';
const path = 'server.ts';
let source = readFileSync(path, 'utf8');
const anchor = `        saveKntTrace({\n          userId: stateUserId,\n          userMessage,\n          reply,\n          reasoningTrace: kdm.trace,\n          dynamicState: kdm.nextDynamicState,\n          timings: {\n            memoryMs,\n            kdmMs,\n            aiMs: 0,`;
if (!source.includes(anchor)) throw new Error('local saveKntTrace anchor not found');
const insertion = `        recordKdmMetric({\n          userId: stateUserId,\n          score: consistency.score,\n          accepted: consistency.accepted,\n          repaired: false,\n          repairAttempts: 0,\n          issues: consistency.issues,\n        }),\n`;
source = source.replace(anchor, insertion + anchor);
writeFileSync(path, source);
