import { readFileSync, writeFileSync } from 'node:fs';

const path = 'server.ts';
let source = readFileSync(path, 'utf8');

const importNeedle = `import {\n  enforceKairoResponse,\n  validateKairoResponse,\n} from "./src/services/kairoResponseConsistency";\n`;
const importInsert = `${importNeedle}import { findKairoResponseRhythmIssues } from "./src/services/kairoResponseRhythm";\n`;
if (!source.includes('findKairoResponseRhythmIssues')) {
  if (!source.includes(importNeedle)) throw new Error('response consistency import not found');
  source = source.replace(importNeedle, importInsert);
}

const replacements = [
  ['      ...findKairaResponsePlanIssues(reply, responsePlan),', '      ...findKairoResponseRhythmIssues(reply, cleanHistory),\n      ...findKairaResponsePlanIssues(reply, responsePlan),'],
  ['          ...findKairaResponsePlanIssues(repairedReply, responsePlan),', '          ...findKairoResponseRhythmIssues(repairedReply, cleanHistory),\n          ...findKairaResponsePlanIssues(repairedReply, responsePlan),'],
  ['          ...findKairaResponsePlanIssues(fallback, responsePlan),', '          ...findKairoResponseRhythmIssues(fallback, cleanHistory),\n          ...findKairaResponsePlanIssues(fallback, responsePlan),'],
  ['        ...findKairaResponsePlanIssues(reply, responsePlan),', '        ...findKairoResponseRhythmIssues(reply, cleanHistory),\n        ...findKairaResponsePlanIssues(reply, responsePlan),'],
  ['          ...findKairaResponsePlanIssues(planSafeFallback, responsePlan),', '          ...findKairoResponseRhythmIssues(planSafeFallback, cleanHistory),\n          ...findKairaResponsePlanIssues(planSafeFallback, responsePlan),'],
];
for (const [needle, replacement] of replacements) {
  if (source.includes(needle) && !source.includes(replacement)) source = source.replace(needle, replacement);
}

writeFileSync(path, source);
