import fs from 'node:fs';

function replaceOrFail(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(from, to);
}

let server = fs.readFileSync('server.ts', 'utf8');

const oldLocalEnforcement = `      const baseEnforced = enforceKairoResponse(local.reply, kdm.trace, enforcementRules),\n        contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract),\n        enforced = { reply: contractEnforced.reply, changed: baseEnforced.changed || contractEnforced.changed, reasons: [...baseEnforced.reasons, ...contractEnforced.reasons] },\n        reply = enforced.reply,\n        consistency = validateKairoResponse(reply, kdm.trace),\n        postStart = now();`;
const newLocalEnforcement = `      const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents),\n        baseEnforced = enforceKairoResponse(worldMemoryGuard.reply, kdm.trace, enforcementRules),\n        contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract),\n        enforced = {\n          reply: contractEnforced.reply,\n          changed: worldMemoryGuard.changed || baseEnforced.changed || contractEnforced.changed,\n          reasons: [\n            ...baseEnforced.reasons,\n            ...contractEnforced.reasons,\n            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),\n          ],\n        },\n        reply = enforced.reply,\n        consistency = validateKairoResponse(reply, kdm.trace),\n        postStart = now();`;
server = replaceOrFail(server, oldLocalEnforcement, newLocalEnforcement, 'local deterministic guard');

server = replaceOrFail(
  server,
  `          providerUsed: "local_language",\n          speechIdentity: speech,\n        }),`,
  `          providerUsed: "local_language",\n          speechIdentity: speech,\n          worldStateAppraisal,\n          worldReasoningPolicy,\n          worldMemoryGuard,\n        }),`,
  'local KNT observability',
);

server = replaceOrFail(
  server,
  `        providerUsed: activeAiProviderUsed,\n        speechIdentity: speech,\n      }),`,
  `        providerUsed: activeAiProviderUsed,\n        speechIdentity: speech,\n        worldStateAppraisal,\n        worldReasoningPolicy,\n        worldMemoryGuard,\n      }),`,
  'AI KNT observability',
);

server = replaceOrFail(
  server,
  `            worldStateAppraisal,\n            worldReasoningPolicy,\n            timings: { memoryMs, kdmMs, aiMs: 0 },`,
  `            worldStateAppraisal,\n            worldReasoningPolicy,\n            worldMemoryGuard,\n            timings: { memoryMs, kdmMs, aiMs: 0 },`,
  'local test-session guard metadata',
);

server = replaceOrFail(
  server,
  `          worldStateAppraisal,\n          worldReasoningPolicy,\n          timings: { memoryMs, kdmMs, aiMs },`,
  `          worldStateAppraisal,\n          worldReasoningPolicy,\n          worldMemoryGuard,\n          timings: { memoryMs, kdmMs, aiMs },`,
  'AI test-session guard metadata',
);

const responseNeedle = `worldStateAppraisal, worldReasoningPolicy, behaviorContract`;
const responseCount = server.split(responseNeedle).length - 1;
if (responseCount !== 2) throw new Error(`Expected 2 response kdm targets, found ${responseCount}`);
server = server.replaceAll(responseNeedle, `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract`);

fs.writeFileSync('server.ts', server);

let persistence = fs.readFileSync('src/services/kdmPersistenceService.ts', 'utf8');
persistence = replaceOrFail(
  persistence,
  `export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; speechIdentity?: unknown; createdAt?: string; }`,
  `export interface KntTracePayload { userId?: string; userMessage: string; reply: string; reasoningTrace: ReasoningTrace; dynamicState: DroitDynamicState; timings: Record<string, number>; providerUsed?: string; speechIdentity?: unknown; worldStateAppraisal?: unknown; worldReasoningPolicy?: unknown; worldMemoryGuard?: unknown; createdAt?: string; }`,
  'KNT trace payload world reasoning fields',
);
persistence = replaceOrFail(
  persistence,
  `    worldStateAppraisal?: unknown;\n    worldReasoningPolicy?: unknown;\n  };`,
  `    worldStateAppraisal?: unknown;\n    worldReasoningPolicy?: unknown;\n    worldMemoryGuard?: unknown;\n  };`,
  'test-session metadata guard type',
);
fs.writeFileSync('src/services/kdmPersistenceService.ts', persistence);

let state = fs.readFileSync('PROJECT_STATE.md', 'utf8');
state = state.replace(
  `- GitHub Actions üzerinde TypeScript ve production build doğrulaması var; test komutu CI akışına henüz ekli değil.`,
  `- GitHub Actions CI; architecture contracts, testler, TypeScript kontrolü ve production build adımlarını çalıştırıyor.`,
);
state = state.replace(
  `- CI \`npm run lint\` ve \`npm run build\` çalıştırıyor fakat \`npm test\` henüz CI'a bağlı değil.`,
  `- CI artık architecture contracts, testler, TypeScript kontrolü ve production build adımlarını birlikte doğruluyor.`,
);
if (!state.includes('## 20. World reasoning / deterministic guard — 2026-08-30')) {
  state += `\n\n## 20. World reasoning / deterministic guard — 2026-08-30\n- Canonical world-memory retrieval sonrası read-only \`WorldStateAppraisal\` ve \`WorldReasoningPolicy\` katmanları aktif.\n- Deterministic \`worldModelResponseGuard\`, grounded kanıt varken hafızayı inkâr etme, çelişkiyi tek tarafa düşürme, reported claim kaynak atfını kaybetme ve gerekli epistemik nitelemeyi kaldırma durumlarını modelden bağımsız olarak engelliyor.\n- Reported claim ile direct interaction ayrımı contract testleriyle kilitli; direct interaction yanlışlıkla kullanıcı kaynaklı bilgi gibi etiketlenmiyor.\n- Guard yalnız AI yolunda değil, Yerel Dil Motoru erken dönüş yolunda da uygulanıyor; world reasoning boundary bütün cevap yollarında bağlayıcı.\n- \`worldStateAppraisal\`, \`worldReasoningPolicy\` ve \`worldMemoryGuard\` KNT trace, test-session metadata ve chat debug/KDM response içinde gözlemlenebilir. Böylece tek turda policy kararı, guard issue listesi ve cevabın değiştirilip değiştirilmediği izlenebilir.\n- CI bu değişiklikleri architecture contracts + tests + TypeScript + production build ile doğrular.\n`;
}
fs.writeFileSync('PROJECT_STATE.md', state);

console.log('World guard observability patch applied.');
