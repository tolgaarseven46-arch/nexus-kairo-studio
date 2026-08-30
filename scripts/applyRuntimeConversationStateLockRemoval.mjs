import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace('import { projectConversationStateLock } from "./src/services/conversationStateLock";\n', '');
server = server.replace('      conversationStateLock = projectConversationStateLock(kdm.nextDynamicState),\n', '');
if (server.includes('projectConversationStateLock')) throw new Error('Runtime conversation-state lock projection still remains in server');
fs.writeFileSync('server.ts', server);

let ownership = fs.readFileSync('src/services/kairaBasePersonalityOwnershipContracts.test.ts', 'utf8');
ownership = ownership.replaceAll('),\\n      conversationStateLock', '),\\n      responseStylePersonality');
ownership = ownership.replace(
  '    const afterKdm = server.slice(server.indexOf("conversationStateLock = projectConversationStateLock"));\n    expect(afterKdm).toContain("conversationStateLock = projectConversationStateLock(kdm.nextDynamicState)");',
  '    const afterKdm = server.slice(server.indexOf("responseStylePersonality = responsePersonality"));',
);
if (ownership.includes('conversationStateLock = projectConversationStateLock')) throw new Error('Ownership contract still requires runtime state-lock projection');
fs.writeFileSync('src/services/kairaBasePersonalityOwnershipContracts.test.ts', ownership);

let appraisal = fs.readFileSync('src/services/kairaWorldStateAppraisalIntegrationContracts.test.ts', 'utf8');
appraisal = appraisal.replace('),\\n      conversationStateLock', '),\\n      responseStylePersonality');
fs.writeFileSync('src/services/kairaWorldStateAppraisalIntegrationContracts.test.ts', appraisal);

let lockContract = fs.readFileSync('src/services/kairaConversationStateLockContracts.test.ts', 'utf8');
lockContract = lockContract.replace(
  '  it("uses responsePersonality directly after KDM instead of passing it through a fake authority", () => {\n    expect(server).toContain("conversationStateLock = projectConversationStateLock(kdm.nextDynamicState)");\n    expect(server).toContain("responseStylePersonality = responsePersonality");\n    expect(server).not.toContain("applyConversationStateAuthority");\n    expect(server).not.toContain("authoritativePersonality");\n  });',
  '  it("keeps the pure state-lock projection out of the live server response path", () => {\n    expect(server).not.toContain("projectConversationStateLock");\n    expect(server).not.toContain("conversationStateLock =");\n    expect(server).toContain("responseStylePersonality = responsePersonality");\n    expect(server).not.toContain("applyConversationStateAuthority");\n    expect(server).not.toContain("authoritativePersonality");\n  });',
);
if (!lockContract.includes('keeps the pure state-lock projection out of the live server response path')) throw new Error('State-lock runtime-removal contract was not updated');
fs.writeFileSync('src/services/kairaConversationStateLockContracts.test.ts', lockContract);

console.log('Removed unused conversation-state lock projection from live server path');
