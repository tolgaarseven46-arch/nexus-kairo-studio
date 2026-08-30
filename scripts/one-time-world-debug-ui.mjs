import fs from 'node:fs';

function replaceOrFail(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(from, to);
}

// 1) Chat service: expose server world-reasoning debug fields to the Studio client.
let chat = fs.readFileSync('src/services/droitChatService.ts', 'utf8');
chat = replaceOrFail(
  chat,
  `  languageUnderstanding?: ClientLanguageUnderstandingResult;\n}`,
  `  languageUnderstanding?: ClientLanguageUnderstandingResult;\n  worldStateAppraisal?: unknown;\n  worldReasoningPolicy?: unknown;\n  worldMemoryGuard?: unknown;\n}`,
  'chat response world debug fields',
);
chat = replaceOrFail(
  chat,
  `      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId, kairaInstanceId: data.kairaInstanceId || kairaInstance.instanceId, kairaInstanceType: data.kairaInstanceType || kairaInstance.instanceType, languageUnderstanding };`,
  `      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId, kairaInstanceId: data.kairaInstanceId || kairaInstance.instanceId, kairaInstanceType: data.kairaInstanceType || kairaInstance.instanceType, languageUnderstanding, worldStateAppraisal: data.kdm?.worldStateAppraisal, worldReasoningPolicy: data.kdm?.worldReasoningPolicy, worldMemoryGuard: data.kdm?.worldMemoryGuard };`,
  'chat response return world debug',
);
fs.writeFileSync('src/services/droitChatService.ts', chat);

// 2) Persistence: actually retain the metadata fields and expose the latest values on restore.
let persistence = fs.readFileSync('src/services/kdmPersistenceService.ts', 'utf8');
persistence = replaceOrFail(
  persistence,
  `      worldEvent: payload.metadata?.worldEvent,\n      retrievedWorldEvents: payload.metadata?.retrievedWorldEvents,\n    },`,
  `      worldEvent: payload.metadata?.worldEvent,\n      retrievedWorldEvents: payload.metadata?.retrievedWorldEvents,\n      worldStateAppraisal: payload.metadata?.worldStateAppraisal,\n      worldReasoningPolicy: payload.metadata?.worldReasoningPolicy,\n      worldMemoryGuard: payload.metadata?.worldMemoryGuard,\n    },`,
  'persist world reasoning metadata',
);
persistence = replaceOrFail(
  persistence,
  `        lastTimings: lastTurn?.metadata?.timings,\n        lastProviderUsed: lastTurn?.metadata?.providerUsed,`,
  `        lastTimings: lastTurn?.metadata?.timings,\n        lastProviderUsed: lastTurn?.metadata?.providerUsed,\n        lastWorldStateAppraisal: lastTurn?.metadata?.worldStateAppraisal,\n        lastWorldReasoningPolicy: lastTurn?.metadata?.worldReasoningPolicy,\n        lastWorldMemoryGuard: lastTurn?.metadata?.worldMemoryGuard,`,
  'restore latest world reasoning metadata',
);
fs.writeFileSync('src/services/kdmPersistenceService.ts', persistence);

// 3) Shared session types: match the persisted metadata and restored snapshot.
let nexus = fs.readFileSync('src/types/nexus.ts', 'utf8');
nexus = replaceOrFail(
  nexus,
  `    worldEvent?: unknown;\n    retrievedWorldEvents?: unknown;\n  };`,
  `    worldEvent?: unknown;\n    retrievedWorldEvents?: unknown;\n    worldStateAppraisal?: unknown;\n    worldReasoningPolicy?: unknown;\n    worldMemoryGuard?: unknown;\n  };`,
  'turn metadata world reasoning types',
);
nexus = replaceOrFail(
  nexus,
  `  lastTimings?: any;\n  lastProviderUsed?: string;\n}`,
  `  lastTimings?: any;\n  lastProviderUsed?: string;\n  lastWorldStateAppraisal?: unknown;\n  lastWorldReasoningPolicy?: unknown;\n  lastWorldMemoryGuard?: unknown;\n}`,
  'restored session world reasoning types',
);
fs.writeFileSync('src/types/nexus.ts', nexus);

// 4) Studio layout: retain latest world-debug snapshot across send/restore/reset and pass it to MindMap.
let layout = fs.readFileSync('src/components/studio/NexusStudioLayout.tsx', 'utf8');
layout = replaceOrFail(
  layout,
  `    [lastProviderUsed, setLastProviderUsed] = useState<string | null>(null),\n    [activeConversationScope, setActiveConversationScope] = useState<`,
  `    [lastProviderUsed, setLastProviderUsed] = useState<string | null>(null),\n    [lastWorldStateAppraisal, setLastWorldStateAppraisal] = useState<unknown>(null),\n    [lastWorldReasoningPolicy, setLastWorldReasoningPolicy] = useState<unknown>(null),\n    [lastWorldMemoryGuard, setLastWorldMemoryGuard] = useState<unknown>(null),\n    [activeConversationScope, setActiveConversationScope] = useState<`,
  'layout world debug state',
);
layout = replaceOrFail(
  layout,
  `          if (restored.lastProviderUsed) {\n            setLastProviderUsed(restored.lastProviderUsed);\n          }\n          setActiveConversationScope(restored.summary.userId);`,
  `          if (restored.lastProviderUsed) {\n            setLastProviderUsed(restored.lastProviderUsed);\n          }\n          setLastWorldStateAppraisal(restored.lastWorldStateAppraisal ?? null);\n          setLastWorldReasoningPolicy(restored.lastWorldReasoningPolicy ?? null);\n          setLastWorldMemoryGuard(restored.lastWorldMemoryGuard ?? null);\n          setActiveConversationScope(restored.summary.userId);`,
  'restore world debug state',
);
// There are three reset blocks with the same provider line; reset world debug after each.
layout = layout.replaceAll(
  `    setLastProviderUsed(null);\n`,
  `    setLastProviderUsed(null);\n    setLastWorldStateAppraisal(null);\n    setLastWorldReasoningPolicy(null);\n    setLastWorldMemoryGuard(null);\n`,
);
layout = replaceOrFail(
  layout,
  `        setLastProviderUsed(response.providerUsed || null);\n        setActiveConversationScope(conversationScope);`,
  `        setLastProviderUsed(response.providerUsed || null);\n        setLastWorldStateAppraisal(response.worldStateAppraisal ?? null);\n        setLastWorldReasoningPolicy(response.worldReasoningPolicy ?? null);\n        setLastWorldMemoryGuard(response.worldMemoryGuard ?? null);\n        setActiveConversationScope(conversationScope);`,
  'capture response world debug',
);
layout = replaceOrFail(
  layout,
  `            consistency={lastAnalysis}\n            participants={TEST_USERS}`,
  `            consistency={lastAnalysis}\n            worldStateAppraisal={lastWorldStateAppraisal}\n            worldReasoningPolicy={lastWorldReasoningPolicy}\n            worldMemoryGuard={lastWorldMemoryGuard}\n            participants={TEST_USERS}`,
  'MindMap world debug props',
);
fs.writeFileSync('src/components/studio/NexusStudioLayout.tsx', layout);

// 5) MindMap: display and copy appraisal -> policy -> guard chain for the latest turn.
let mind = fs.readFileSync('src/components/studio/tabs/MindMapTab.tsx', 'utf8');
mind = replaceOrFail(
  mind,
  `  consistency: ResponseConsistencyResult | null;\n  participants: ReadonlyArray<{ id: string; label: string }>;`,
  `  consistency: ResponseConsistencyResult | null;\n  worldStateAppraisal?: unknown;\n  worldReasoningPolicy?: unknown;\n  worldMemoryGuard?: unknown;\n  participants: ReadonlyArray<{ id: string; label: string }>;`,
  'MindMap props type',
);
mind = replaceOrFail(
  mind,
  `  consistency,\n  participants,`,
  `  consistency,\n  worldStateAppraisal,\n  worldReasoningPolicy,\n  worldMemoryGuard,\n  participants,`,
  'MindMap destructure world debug',
);
mind = replaceOrFail(
  mind,
  `  const hasResult = Boolean(lastUser && lastReply && timings);\n  const responseSource = sourceLabel(providerUsed, timings);`,
  `  const hasResult = Boolean(lastUser && lastReply && timings);\n  const responseSource = sourceLabel(providerUsed, timings);\n  const worldAppraisal = (worldStateAppraisal || {}) as Record<string, any>;\n  const worldPolicy = (worldReasoningPolicy || {}) as Record<string, any>;\n  const worldGuard = (worldMemoryGuard || {}) as Record<string, any>;\n  const worldGuardIssues = Array.isArray(worldGuard.issues)\n    ? worldGuard.issues.map((issue: any) => issue?.code || issue?.message || String(issue)).filter(Boolean)\n    : [];`,
  'MindMap world debug normalization',
);
const oldReport = `KDM doğrulaması: \${consistency ? \`\${consistency.accepted ? "Kabul" : "Sorunlu"} (\${consistency.score}/100)\${consistency.issues.length ? \` - \${consistency.issues.join("; ")}\` : ""}\` : "ölçüm yok"}\\nSüreler:`;
const newReport = `KDM doğrulaması: \${consistency ? \`\${consistency.accepted ? "Kabul" : "Sorunlu"} (\${consistency.score}/100)\${consistency.issues.length ? \` - \${consistency.issues.join("; ")}\` : ""}\` : "ölçüm yok"}\\nWorld appraisal: truth=\${worldAppraisal.truthPosture ?? "-"}, evidence=\${worldAppraisal.evidencePosture ?? "-"}, grounded=\${worldAppraisal.groundedEvidenceCount ?? 0}\\nWorld policy: mode=\${worldPolicy.mode ?? "-"}, qualify=\${worldPolicy.mustQualify ?? false}, conflict=\${worldPolicy.mustPreserveConflict ?? false}, attribution=\${worldPolicy.mustPreserveReportedAttribution ?? false}\\nWorld guard: changed=\${worldGuard.changed ?? false}, reason=\${worldGuard.reason ?? "-"}, issues=\${worldGuardIssues.length ? worldGuardIssues.join(",") : "yok"}\\nSüreler:`;
mind = replaceOrFail(mind, oldReport, newReport, 'KNT last-turn report world debug');

const decisionAnchor = `                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">\n                      <p className="text-[9px] font-mono font-bold text-zinc-300">\n                        KARAR AÇIKLAMASI`;
const worldPanel = `                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3">\n                      <DataRow label="WORLD APPRAISAL" value={String(worldAppraisal.truthPosture ?? "-")} accent />\n                      <DataRow label="EVIDENCE POSTURE" value={String(worldAppraisal.evidencePosture ?? "-")} />\n                      <DataRow label="REASONING MODE" value={String(worldPolicy.mode ?? "-")} />\n                      <DataRow label="QUALIFY" value={worldPolicy.mustQualify ? "Evet" : "Hayır"} />\n                      <DataRow label="CONFLICT KORU" value={worldPolicy.mustPreserveConflict ? "Evet" : "Hayır"} />\n                      <DataRow label="KAYNAK ATFI" value={worldPolicy.mustPreserveReportedAttribution ? "Evet" : "Hayır"} />\n                      <DataRow label="GUARD DEĞİŞTİRDİ" value={worldGuard.changed ? "Evet" : "Hayır"} />\n                      <DataRow label="GUARD NEDENİ" value={String(worldGuard.reason ?? "-")} />\n                      <DataRow label="GUARD ISSUES" value={worldGuardIssues.length ? worldGuardIssues.join(", ") : "Yok"} />\n                    </div>\n` + decisionAnchor;
mind = replaceOrFail(mind, decisionAnchor, worldPanel, 'decision inspector world panel');
fs.writeFileSync('src/components/studio/tabs/MindMapTab.tsx', mind);

// 6) Lock runtime wiring so a future refactor cannot silently drop local guard or metadata persistence again.
let test = fs.readFileSync('src/services/kairaWorldModelResponseGuardIntegrationContracts.test.ts', 'utf8');
test = replaceOrFail(
  test,
  `const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");`,
  `const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");\nconst persistence = fs.readFileSync(path.resolve(process.cwd(), "src/services/kdmPersistenceService.ts"), "utf8");`,
  'integration test persistence source',
);
test = replaceOrFail(
  test,
  `  it("runs deterministic recall enforcement before behavior enforcement", () => {`,
  `  it("guards local-language early returns too", () => {\n    expect(server).toContain("const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents)");\n  });\n\n  it("persists world reasoning observability fields", () => {\n    expect(persistence).toContain("worldStateAppraisal: payload.metadata?.worldStateAppraisal");\n    expect(persistence).toContain("worldReasoningPolicy: payload.metadata?.worldReasoningPolicy");\n    expect(persistence).toContain("worldMemoryGuard: payload.metadata?.worldMemoryGuard");\n  });\n\n  it("runs deterministic recall enforcement before behavior enforcement", () => {`,
  'integration tests local/persistence contracts',
);
fs.writeFileSync('src/services/kairaWorldModelResponseGuardIntegrationContracts.test.ts', test);

// 7) Correct project-state note now that the UI/report path is genuinely wired.
let state = fs.readFileSync('PROJECT_STATE.md', 'utf8');
state = state.replace(
  `- \`worldStateAppraisal\`, \`worldReasoningPolicy\` ve \`worldMemoryGuard\` KNT trace, test-session metadata ve chat debug/KDM response içinde gözlemlenebilir. Böylece tek turda policy kararı, guard issue listesi ve cevabın değiştirilip değiştirilmediği izlenebilir.`,
  `- \`worldStateAppraisal\`, \`worldReasoningPolicy\` ve \`worldMemoryGuard\` KNT trace, test-session metadata, chat debug/KDM response ve Studio SON KARAR İZİ/SON TURU KOPYALA raporunda gözlemlenebilir. Böylece tek turda appraisal → policy → guard zinciri, guard issue listesi ve cevabın değiştirilip değiştirilmediği izlenebilir.`,
);
fs.writeFileSync('PROJECT_STATE.md', state);

console.log('World debug UI patch applied.');
