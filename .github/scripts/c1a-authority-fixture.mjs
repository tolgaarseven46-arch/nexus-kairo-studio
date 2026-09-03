import fs from 'node:fs';

const testPath = 'src/services/discourseStateReducer.test.ts';
const testSource = fs.readFileSync(testPath, 'utf8');
const beforeFixture = '      { sender: "user", text: "naber" },';
const afterFixture = '      { sender: "user", text: "naber", semanticEvent: interpretSemanticEvent("naber") },';
if (!testSource.includes(afterFixture)) {
  if (!testSource.includes(beforeFixture)) throw new Error('deriveDiscourseState history fixture not found');
  fs.writeFileSync(testPath, testSource.replace(beforeFixture, afterFixture));
}

const groundingPath = 'src/services/kairoConversationGrounding.ts';
let grounding = fs.readFileSync(groundingPath, 'utf8');
if (!grounding.includes('import type { SemanticEvent } from "./semanticEventEngine";')) {
  grounding = `import type { SemanticEvent } from "./semanticEventEngine";\n${grounding}`;
}
grounding = grounding.replace('  semanticEvent?: unknown;\n', '  semanticEvent?: SemanticEvent;\n');
fs.writeFileSync(groundingPath, grounding);

console.log('C1a discourse fixture and canonical history typing migrated.');
