import fs from 'node:fs';

const serverPath = 'server.ts';
let server = fs.readFileSync(serverPath, 'utf8');
const compatibilityField = ', conversationAuthority: { state: conversationStateLock.state, locked: conversationStateLock.locked, reason: conversationStateLock.reason }';
const beforeCount = server.split(compatibilityField).length - 1;
if (beforeCount === 0) throw new Error('conversationAuthority compatibility field not found in server');
server = server.split(compatibilityField).join('');
if (server.includes('conversationAuthority:')) throw new Error('conversationAuthority response compatibility field still remains');
fs.writeFileSync(serverPath, server);

const contractPath = 'src/services/kairaConversationStateLockContracts.test.ts';
let contract = fs.readFileSync(contractPath, 'utf8');
contract = contract.replace(
  '  it("keeps external debug compatibility metadata while sourcing it from the pure lock projection", () => {\n    expect(server).toContain("conversationAuthority: { state: conversationStateLock.state, locked: conversationStateLock.locked, reason: conversationStateLock.reason }");\n  });',
  '  it("does not expose the retired conversationAuthority compatibility name", () => {\n    expect(server).not.toContain("conversationAuthority:");\n  });',
);
if (!contract.includes('does not expose the retired conversationAuthority compatibility name')) {
  throw new Error('state-lock contract compatibility assertion was not updated');
}
fs.writeFileSync(contractPath, contract);

console.log(`Removed ${beforeCount} conversationAuthority compatibility response field(s)`);
