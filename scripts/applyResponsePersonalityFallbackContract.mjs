import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');
const oldFallback = 'responsePersonality = (incomingResponsePersonality || personality) as DroitPersonalityTraits';
const newFallback = 'responsePersonality = (incomingResponsePersonality ?? personality) as DroitPersonalityTraits';
if (!server.includes(oldFallback) && !server.includes(newFallback)) {
  throw new Error('responsePersonality fallback boundary not found');
}
server = server.replace(oldFallback, newFallback);
if (server.includes(oldFallback)) throw new Error('broad || response personality fallback remains');
fs.writeFileSync('server.ts', server);

const contractPath = 'src/services/kairaBasePersonalityOwnershipContracts.test.ts';
let contract = fs.readFileSync(contractPath, 'utf8');
contract = contract.replace(
  '    expect(server).toContain("responsePersonality = (incomingResponsePersonality || personality) as DroitPersonalityTraits");',
  '    expect(server).toContain("responsePersonality = (incomingResponsePersonality ?? personality) as DroitPersonalityTraits");\n    expect(server).not.toContain("incomingResponsePersonality || personality");',
);
if (!contract.includes('incomingResponsePersonality ?? personality')) {
  throw new Error('ownership contract did not adopt explicit nullish fallback');
}
fs.writeFileSync(contractPath, contract);

console.log('Narrowed responsePersonality fallback to omitted/null compatibility only');
