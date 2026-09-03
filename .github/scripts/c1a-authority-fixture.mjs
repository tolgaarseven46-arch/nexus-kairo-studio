import fs from 'node:fs';
const path = 'src/services/discourseStateReducer.test.ts';
const source = fs.readFileSync(path, 'utf8');
const before = '      { sender: "user", text: "naber" },';
const after = '      { sender: "user", text: "naber", semanticEvent: interpretSemanticEvent("naber") },';
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('deriveDiscourseState history fixture not found');
  fs.writeFileSync(path, source.replace(before, after));
}
console.log('C1a discourse history fixture migrated.');
