import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');
const oldRequestField = '      personality = {},\n';
const newRequestField = '      personality,\n';
if (!server.includes(oldRequestField) && !server.includes(newRequestField)) {
  throw new Error('personality request field not found');
}
server = server.replace(oldRequestField, newRequestField);
if (server.includes(oldRequestField)) throw new Error('redundant personality = {} request default remains');
if (!server.includes('basePersonality = normalizeDroitPersonality(personality)')) {
  throw new Error('personality is not normalized after request destructuring');
}
fs.writeFileSync('server.ts', server);

const contractPath = 'src/services/kairaBasePersonalityOwnershipContracts.test.ts';
let contract = fs.readFileSync(contractPath, 'utf8');
const assertionAnchor = '    expect(server).toContain("basePersonality = normalizeDroitPersonality(personality)");';
if (!contract.includes('expect(server).not.toContain("personality = {},")')) {
  contract = contract.replace(
    assertionAnchor,
    '    expect(server).toContain("      personality,\\n      responsePersonality: incomingResponsePersonality,");\n    expect(server).not.toContain("personality = {},");\n' + assertionAnchor,
  );
}
if (!contract.includes('expect(server).not.toContain("personality = {},")')) {
  throw new Error('ownership contract did not forbid redundant personality request default');
}
fs.writeFileSync(contractPath, contract);

console.log('Removed redundant personality request destructuring default');
