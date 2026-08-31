import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/kairoDialogueDecisionEngine.ts';
let source = readFileSync(path, 'utf8');

const setNeedle = `  "repair_or_rephrase",\n]);`;
const setReplacement = `  "repair_or_rephrase",\n  "follow_topic_shift",\n]);`;
if (!source.includes('"follow_topic_shift",\n]);')) {
  if (!source.includes(setNeedle)) throw new Error('social move set insertion point not found');
  source = source.replace(setNeedle, setReplacement);
}

const fallbackNeedle = `  if (plan.move === "natural_reaction") return "he anladım";\n  if (plan.move === "join_banter") {`;
const fallbackReplacement = `  if (plan.move === "natural_reaction") return "he anladım";\n  if (plan.move === "follow_topic_shift") return "he tamam";\n  if (plan.move === "join_banter") {`;
if (!source.includes('plan.move === "follow_topic_shift") return "he tamam"')) {
  if (!source.includes(fallbackNeedle)) throw new Error('topic-shift fallback insertion point not found');
  source = source.replace(fallbackNeedle, fallbackReplacement);
}

writeFileSync(path, source);
