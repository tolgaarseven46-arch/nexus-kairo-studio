import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

const importAnchor = 'import { persistWorldEventAndMaybeConsolidateLivedMemory } from "./src/services/kairaLivedMemoryRuntime";';
const importLine = 'import { observeKairaActivityDynamicState } from "./src/services/kairaActivityDynamicStateObservationCoordinator";';
if (!source.includes(importAnchor)) throw new Error("lived-memory import anchor missing");
if (!source.includes(importLine)) source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);

const localAnchor = `      ]);\n      memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));`;
const localBlock = `      ]);\n      const autonomousStateSourceId = requestId\n        ? \`chat_request:\${requestId}\`\n        : savedTurnId\n          ? \`chat_turn:\${savedTurnId}\`\n          : \"\";\n      if (kairaPolicy.autonomousActivityPlanning && autonomousStateSourceId) {\n        await Promise.allSettled([\n          observeKairaActivityDynamicState({\n            ownerUserId: String(userId),\n            kairaInstanceId: kairaInstance.instanceId,\n            instanceType: kairaInstance.instanceType,\n            state: kdm.nextDynamicState,\n            observedAt: new Date().toISOString(),\n            sourceId: autonomousStateSourceId,\n          }),\n        ]);\n      }\n      memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));`;
if (!source.includes(localAnchor)) throw new Error("local post-turn anchor missing");
source = source.replace(localAnchor, localBlock);

const aiAnchor = `    ]);\n    memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));`;
const aiBlock = `    ]);\n    const autonomousStateSourceId = requestId\n      ? \`chat_request:\${requestId}\`\n      : savedTurnId\n        ? \`chat_turn:\${savedTurnId}\`\n        : \"\";\n    if (kairaPolicy.autonomousActivityPlanning && autonomousStateSourceId) {\n      await Promise.allSettled([\n        observeKairaActivityDynamicState({\n          ownerUserId: String(userId),\n          kairaInstanceId: kairaInstance.instanceId,\n          instanceType: kairaInstance.instanceType,\n          state: kdm.nextDynamicState,\n          observedAt: new Date().toISOString(),\n          sourceId: autonomousStateSourceId,\n        }),\n      ]);\n    }\n    memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));`;
if (!source.includes(aiAnchor)) throw new Error("AI post-turn anchor missing");
source = source.replace(aiAnchor, aiBlock);

const calls = source.match(/observeKairaActivityDynamicState\(\{/g) || [];
if (calls.length !== 2) throw new Error(`expected exactly 2 autonomous state calls, found ${calls.length}`);

fs.writeFileSync(path, source);
