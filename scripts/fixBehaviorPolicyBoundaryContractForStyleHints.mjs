import fs from 'node:fs';

const path = 'src/services/kairaBehaviorPolicyBoundaryContracts.test.ts';
let source = fs.readFileSync(path, 'utf8');
const from = '    expect(client).toMatch(/createClientBehaviorPolicy\\(\\s*integrationRuntime\\.decision,\\s*integrationRuntime\\.pressures,?\\s*\\)/u);';
const to = '    expect(client).toMatch(/createClientBehaviorPolicy\\(\\s*integrationRuntime\\.decision,\\s*integrationRuntime\\.pressures(?:,\\s*expressionRuntime\\.response)?[,]?\\s*\\)/u);';
if (!source.includes(from)) throw new Error('behavior policy boundary regex marker not found');
source = source.replace(from, to);
fs.writeFileSync(path, source);
console.log('Updated behavior policy architecture contract to allow explicit optional style hints');
