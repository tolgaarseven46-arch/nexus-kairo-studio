import fs from 'node:fs';

const path = 'src/services/behaviorIntegrationEngine.ts';
const text = fs.readFileSync(path, 'utf8');
const old = '    continueConversation: !disengage,';
const replacement = '    continueConversation: !disengage && !semanticEvent.stopTalking,';
if (!text.includes(old)) throw new Error('continueConversation marker missing');
fs.writeFileSync(path, text.replace(old, replacement));
console.log('Applied explicit stop-talking authority fix');
