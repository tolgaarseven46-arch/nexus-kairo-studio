import fs from 'node:fs';

const path = 'src/services/kdmPersistenceService.ts';
let source = fs.readFileSync(path, 'utf8');
const needle = `      timings: payload.metadata?.timings,\n      speechIdentity: payload.metadata?.speechIdentity,`;
const replacement = `      timings: payload.metadata?.timings,\n      languageStyleMemory: payload.metadata?.languageStyleMemory,\n      controlledSpontaneity: payload.metadata?.controlledSpontaneity,\n      speechIdentity: payload.metadata?.speechIdentity,`;
if (!source.includes(needle)) throw new Error('metadata insertion point not found');
source = source.replace(needle, replacement);
fs.writeFileSync(path, source);
