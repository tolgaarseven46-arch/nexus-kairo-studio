import { readFileSync, writeFileSync } from 'node:fs';

const path = 'server.ts';
let source = readFileSync(path, 'utf8');
for (const name of ['reply', 'repairedReply', 'fallback', 'planSafeFallback']) {
  source = source.replaceAll(
    `findKairoResponseRhythmIssues(${name}, cleanHistory)`,
    `findKairoResponseRhythmIssues(${name}, cleanHistory, dialogueDecision.move)`,
  );
}
writeFileSync(path, source);
