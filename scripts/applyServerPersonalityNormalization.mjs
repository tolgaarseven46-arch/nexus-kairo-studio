import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');
const importAnchor = 'import { normalizeBehaviorPolicyInput } from "./src/services/behaviorPolicyInput";\n';
const normalizerImport = 'import { normalizeDroitPersonality } from "./src/services/droitPersonalityNormalizer";\n';
if (!server.includes(normalizerImport)) {
  if (!server.includes(importAnchor)) throw new Error('behavior policy import anchor not found');
  server = server.replace(importAnchor, importAnchor + normalizerImport);
}

const oldBoundary = '      basePersonality = personality as DroitPersonalityTraits,\n      responsePersonality = (incomingResponsePersonality ?? personality) as DroitPersonalityTraits,';
const newBoundary = '      basePersonality = normalizeDroitPersonality(personality),\n      responsePersonality = normalizeDroitPersonality(incomingResponsePersonality ?? basePersonality),';
if (!server.includes(oldBoundary) && !server.includes(newBoundary)) {
  throw new Error('server personality boundary not found');
}
server = server.replace(oldBoundary, newBoundary);
server = server.replace('  DroitPersonalityTraits,\n', '');
if (server.includes('personality as DroitPersonalityTraits')) throw new Error('unsafe base personality cast remains');
if (server.includes('incomingResponsePersonality ?? personality')) throw new Error('response fallback bypasses normalized base personality');
fs.writeFileSync('server.ts', server);

const contractPath = 'src/services/kairaBasePersonalityOwnershipContracts.test.ts';
let contract = fs.readFileSync(contractPath, 'utf8');
contract = contract.replace(
  '    expect(server).toContain("basePersonality = personality as DroitPersonalityTraits");\n    expect(server).toContain("responsePersonality = (incomingResponsePersonality ?? personality) as DroitPersonalityTraits");\n    expect(server).not.toContain("incomingResponsePersonality || personality");',
  '    expect(server).toContain("basePersonality = normalizeDroitPersonality(personality)");\n    expect(server).toContain("responsePersonality = normalizeDroitPersonality(incomingResponsePersonality ?? basePersonality)");\n    expect(server).not.toContain("personality as DroitPersonalityTraits");\n    expect(server).not.toContain("incomingResponsePersonality || personality");',
);
if (!contract.includes('basePersonality = normalizeDroitPersonality(personality)')) {
  throw new Error('ownership contract did not adopt normalized personality boundary');
}
fs.writeFileSync(contractPath, contract);

console.log('Server personality boundary now normalizes base and response personalities');
