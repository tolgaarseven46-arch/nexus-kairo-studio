import fs from "node:fs";

function replace(path, from, to, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`${path}: missing ${label}`);
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
}

replace(
  "src/services/kdmPersistenceService.ts",
  "import type { DialogueMemoryScope, DialogueTurnAnalysis } from './kairoDialogueChaosEngine';",
  "import type { DialogueMemoryScope, DialogueTurnAnalysis } from './kairoDialogueChaosEngine';\nimport type { SemanticInterpretation } from '../types/semanticInterpretation';",
  "semantic interpretation type import",
);
replace(
  "src/services/kdmPersistenceService.ts",
  "providerUsed?: string; languageStyleMemory?: unknown;",
  "providerUsed?: string; semanticInterpretation?: SemanticInterpretation; semanticEvent?: unknown; semanticSource?: string; languageStyleMemory?: unknown;",
  "KNT semantic payload fields",
);

replace(
  "server.ts",
  '          providerUsed: "local_language",\n          languageStyleMemory,',
  '          providerUsed: "local_language",\n          semanticInterpretation: canonicalSemantic.interpretation,\n          semanticEvent: canonicalSemantic.event,\n          semanticSource: canonicalSemantic.source,\n          languageStyleMemory,',
  "local KNT semantic snapshot",
);
replace(
  "server.ts",
  "        providerUsed: activeAiProviderUsed,\n        languageStyleMemory,",
  "        providerUsed: activeAiProviderUsed,\n        semanticInterpretation: canonicalSemantic.interpretation,\n        semanticEvent: canonicalSemantic.event,\n        semanticSource: canonicalSemantic.source,\n        languageStyleMemory,",
  "AI KNT semantic snapshot",
);

replace(
  "src/components/common/KntTurnDebugPanel.tsx",
  "const turnText = (trace: any, index: number) => [",
  `const semanticLine = (trace: any) => {\n  const semantic = trace?.semanticInterpretation || {};\n  const facets = semantic?.discourseFacets || {};\n  const uncertainty = semantic?.uncertainty || {};\n  return [\n    \`intent=\${semantic.primaryIntent ?? '-'}\`,\n    \`target=\${semantic.target ?? '-'}\`,\n    \`routine=\${facets.socialRoutine ?? '-'}\`,\n    \`act=\${facets.discourseAct ?? '-'}\`,\n    \`repair=\${facets.repairSignal ?? '-'}\`,\n    \`advice=\${facets.adviceRequested ?? '-'}\`,\n    \`stopQ=\${facets.stopQuestions ?? '-'}\`,\n    \`stopTalk=\${facets.stopTalking ?? '-'}\`,\n    \`uncertainty=\${typeof uncertainty.overall === 'number' ? uncertainty.overall.toFixed(2) : '-'}\`,\n  ].join(' · ');\n};\n\nconst turnText = (trace: any, index: number) => [`,
  "semantic summary helper",
);
replace(
  "src/components/common/KntTurnDebugPanel.tsx",
  "  `Provider: ${trace?.providerUsed ?? '-'}`,\n].join('\\n');",
  "  `Provider: ${trace?.providerUsed ?? '-'}`,\n  `SemanticSource: ${trace?.semanticSource ?? '-'}`,\n  `Canonical: ${semanticLine(trace)}`,\n].join('\\n');",
  "copy semantic summary",
);
replace(
  "src/components/common/KntTurnDebugPanel.tsx",
  "            <div className=\"mt-2 grid grid-cols-2 gap-1.5 text-[9px] font-mono sm:grid-cols-3\">",
  "            <div className=\"mt-2 grid grid-cols-2 gap-1.5 text-[9px] font-mono sm:grid-cols-4\">",
  "semantic source grid width",
);
replace(
  "src/components/common/KntTurnDebugPanel.tsx",
  "              <div className=\"rounded border border-zinc-800 px-2 py-1\"><span className=\"text-zinc-500\">Provider </span><span className=\"text-zinc-200\">{current?.providerUsed ?? '-'}</span></div>\n            </div>",
  "              <div className=\"rounded border border-zinc-800 px-2 py-1\"><span className=\"text-zinc-500\">Provider </span><span className=\"text-zinc-200\">{current?.providerUsed ?? '-'}</span></div>\n              <div className=\"rounded border border-zinc-800 px-2 py-1\"><span className=\"text-zinc-500\">Semantic </span><span className=\"text-zinc-200\">{current?.semanticSource ?? '-'}</span></div>\n            </div>",
  "semantic source card",
);
replace(
  "src/components/common/KntTurnDebugPanel.tsx",
  "                {JSON.stringify({\n                  timings: current?.timings,",
  "                {JSON.stringify({\n                  semanticSource: current?.semanticSource,\n                  semanticInterpretation: current?.semanticInterpretation,\n                  semanticEvent: current?.semanticEvent,\n                  timings: current?.timings,",
  "technical semantic details",
);

console.log("KNT canonical semantic observability patched");
