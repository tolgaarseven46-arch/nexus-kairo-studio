import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/services/kdmConsistencyEngine.ts';
let source = readFileSync(path, 'utf8');
const needle = '    hurtAfter = clamp(hurtAfter - healingRate * 0.5);';
const replacement = '    hurtAfter = clamp(hurtAfter - Math.max(1, healingRate));';
if (!source.includes(replacement)) {
  if (!source.includes(needle)) throw new Error('neutral hurt healing line not found');
  source = source.replace(needle, replacement);
}
writeFileSync(path, source);
