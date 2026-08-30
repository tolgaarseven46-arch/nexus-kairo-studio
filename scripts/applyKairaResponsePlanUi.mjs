import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let layout = fs.readFileSync('src/components/studio/NexusStudioLayout.tsx', 'utf8');
layout = once(
  layout,
  '    [lastWorldMemoryGuard, setLastWorldMemoryGuard] = useState<unknown>(null),\n    [activeConversationScope, setActiveConversationScope] = useState<',
  '    [lastWorldMemoryGuard, setLastWorldMemoryGuard] = useState<unknown>(null),\n    [lastResponsePlan, setLastResponsePlan] = useState<unknown>(null),\n    [activeConversationScope, setActiveConversationScope] = useState<',
  'layout response plan state',
);
layout = once(
  layout,
  '          setLastWorldMemoryGuard(restored.lastWorldMemoryGuard ?? null);\n          setActiveConversationScope(restored.summary.userId);',
  '          setLastWorldMemoryGuard(restored.lastWorldMemoryGuard ?? null);\n          setLastResponsePlan(restored.lastResponsePlan ?? null);\n          setActiveConversationScope(restored.summary.userId);',
  'layout response plan restore',
);
layout = layout.replaceAll(
  '    setLastWorldMemoryGuard(null);\n',
  '    setLastWorldMemoryGuard(null);\n    setLastResponsePlan(null);\n',
);
layout = once(
  layout,
  '        setLastWorldMemoryGuard(response.worldMemoryGuard ?? null);\n        setActiveConversationScope(conversationScope);',
  '        setLastWorldMemoryGuard(response.worldMemoryGuard ?? null);\n        setLastResponsePlan(response.responsePlan ?? null);\n        setActiveConversationScope(conversationScope);',
  'layout response plan live response',
);
layout = once(
  layout,
  '            worldMemoryGuard={lastWorldMemoryGuard}\n            participants={TEST_USERS}',
  '            worldMemoryGuard={lastWorldMemoryGuard}\n            responsePlan={lastResponsePlan}\n            participants={TEST_USERS}',
  'layout response plan prop',
);
fs.writeFileSync('src/components/studio/NexusStudioLayout.tsx', layout);

let mind = fs.readFileSync('src/components/studio/tabs/MindMapTab.tsx', 'utf8');
mind = once(
  mind,
  '  worldMemoryGuard?: unknown;\n  participants:',
  '  worldMemoryGuard?: unknown;\n  responsePlan?: unknown;\n  participants:',
  'mindmap response plan prop type',
);
mind = once(
  mind,
  '  worldMemoryGuard,\n  participants,',
  '  worldMemoryGuard,\n  responsePlan,\n  participants,',
  'mindmap response plan destructure',
);
mind = once(
  mind,
  '  const worldGuard = (worldMemoryGuard || {}) as Record<string, any>;\n  const worldGuardIssues = Array.isArray(worldGuard.issues)',
  '  const worldGuard = (worldMemoryGuard || {}) as Record<string, any>;\n  const plan = (responsePlan || {}) as Record<string, any>;\n  const planReasons = Array.isArray(plan.reasons) ? plan.reasons.map(String).filter(Boolean) : [];\n  const worldGuardIssues = Array.isArray(worldGuard.issues)',
  'mindmap response plan view model',
);
mind = once(
  mind,
  '\\nWorld guard: changed=${worldGuard.changed ?? false}, reason=${worldGuard.reason ?? "-"}, issues=${worldGuardIssues.length ? worldGuardIssues.join(",") : "yok"}\\nSüreler:',
  '\\nWorld guard: changed=${worldGuard.changed ?? false}, reason=${worldGuard.reason ?? "-"}, issues=${worldGuardIssues.length ? worldGuardIssues.join(",") : "yok"}\\nResponse plan: move=${plan.move ?? "-"}, stance=${plan.stance ?? "-"}, register=${plan.register ?? "-"}, rel=${plan.relationshipLevel ?? "-"}, continue=${plan.continueConversation ?? "-"}, question=${plan.allowQuestion ?? "-"}, humor=${plan.allowHumor ?? "-"}, affection=${plan.allowAffection ?? "-"}, forgive=${plan.allowForgiveness ?? "-"}, reopen=${plan.allowReopeningCloseness ?? "-"}, sentences=${plan.maxSentences ?? "-"}, words=${plan.maxWords ?? "-"}, emoji=${plan.emojiBudget ?? "-"}\\nResponse plan reasons: ${planReasons.length ? planReasons.join(" | ") : "-"}\\nSüreler:',
  'mindmap copied response plan report',
);
mind = once(
  mind,
  '                      <DataRow label="GUARD ISSUES" value={worldGuardIssues.length ? worldGuardIssues.join(", ") : "Yok"} />\n                    </div>\n                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">',
  '                      <DataRow label="GUARD ISSUES" value={worldGuardIssues.length ? worldGuardIssues.join(", ") : "Yok"} />\n                    </div>\n                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3">\n                      <DataRow label="CEVAP PLANI" value={String(plan.move ?? "-")} accent />\n                      <DataRow label="STANCE" value={String(plan.stance ?? "-")} />\n                      <DataRow label="REGISTER" value={String(plan.register ?? "-")} />\n                      <DataRow label="İLİŞKİ DİLİ" value={String(plan.relationshipLevel ?? "-")} />\n                      <DataRow label="DEVAM" value={plan.continueConversation === undefined ? "-" : plan.continueConversation ? "Evet" : "Hayır"} />\n                      <DataRow label="SORU" value={plan.allowQuestion === undefined ? "-" : plan.allowQuestion ? "İzinli" : "Yasak"} />\n                      <DataRow label="MİZAH" value={plan.allowHumor === undefined ? "-" : plan.allowHumor ? "İzinli" : "Yasak"} />\n                      <DataRow label="YAKINLIK" value={plan.allowAffection === undefined ? "-" : plan.allowAffection ? "İzinli" : "Yasak"} />\n                      <DataRow label="AFFETME" value={plan.allowForgiveness === undefined ? "-" : plan.allowForgiveness ? "İzinli" : "Yasak"} />\n                      <DataRow label="YENİDEN YAKINLAŞMA" value={plan.allowReopeningCloseness === undefined ? "-" : plan.allowReopeningCloseness ? "İzinli" : "Yasak"} />\n                      <DataRow label="BÜTÇE" value={plan.maxSentences || plan.maxWords ? `${plan.maxSentences ?? "-"} cümle / ${plan.maxWords ?? "-"} kelime / ${plan.emojiBudget ?? "-"} emoji` : "-"} />\n                    </div>\n                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">',
  'mindmap response plan decision panel',
);
fs.writeFileSync('src/components/studio/tabs/MindMapTab.tsx', mind);

console.log('Kaira response plan UI observability applied');
