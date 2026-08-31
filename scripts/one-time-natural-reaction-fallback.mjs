import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/kairoDialogueDecisionEngine.ts';
let source = readFileSync(path, 'utf8');
const needle = `  if (plan.move === "acknowledge_correction") return "he doğru";\n  if (plan.move === "join_banter") {`;
const replacement = `  if (plan.move === "acknowledge_correction") return "he doğru";\n  if (plan.move === "natural_reaction") return "he anladım";\n  if (plan.move === "join_banter") {`;
if (!source.includes('plan.move === "natural_reaction") return "he anladım"')) {
  if (!source.includes(needle)) throw new Error('natural reaction fallback insertion point not found');
  source = source.replace(needle, replacement);
}
writeFileSync(path, source);
