import { readFileSync, writeFileSync } from 'node:fs';
const path = 'server.ts';
let source = readFileSync(path, 'utf8');
const needle = 'dynamicStateBefore: requestState,';
const count = source.split(needle).length - 1;
if (count !== 2) throw new Error(`expected 2 dynamicStateBefore requestState seams, got ${count}`);
source = source.split(needle).join('dynamicStateBefore: effective,');
writeFileSync(path, source);
