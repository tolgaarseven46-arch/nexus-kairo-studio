import fs from 'node:fs';

let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace('      responseStylePersonality = responsePersonality,\n', '');
server = server.replaceAll('responseStylePersonality,', 'responsePersonality,');
if (server.includes('responseStylePersonality')) throw new Error('responseStylePersonality alias remains in server');
fs.writeFileSync('server.ts', server);

let ownership = fs.readFileSync('src/services/kairaBasePersonalityOwnershipContracts.test.ts', 'utf8');
ownership = ownership.replaceAll('),\\n      responseStylePersonality', '),\\n      behaviorContract');
ownership = ownership.replace(
  '    const afterKdm = server.slice(server.indexOf("responseStylePersonality = responsePersonality"));\n    expect(afterKdm).toContain("responseStylePersonality = responsePersonality");\n    expect(afterKdm).toContain("computeKairoSpeechIdentity(\\n        responseStylePersonality,");\n    expect(afterKdm).toContain("tryLocalKairoReply(\\n        userMessage,\\n        responseStylePersonality,");',
  '    const afterKdm = server.slice(server.indexOf("behaviorContract = buildBehaviorContract"));\n    expect(afterKdm).toContain("computeKairoSpeechIdentity(\\n        responsePersonality,");\n    expect(afterKdm).toContain("tryLocalKairoReply(\\n        userMessage,\\n        responsePersonality,");\n    expect(afterKdm).not.toContain("responseStylePersonality");',
);
if (ownership.includes('responseStylePersonality')) throw new Error('Ownership contract still depends on responseStylePersonality alias');
fs.writeFileSync('src/services/kairaBasePersonalityOwnershipContracts.test.ts', ownership);

let appraisal = fs.readFileSync('src/services/kairaWorldStateAppraisalIntegrationContracts.test.ts', 'utf8');
appraisal = appraisal.replace('),\\n      responseStylePersonality', '),\\n      behaviorContract');
fs.writeFileSync('src/services/kairaWorldStateAppraisalIntegrationContracts.test.ts', appraisal);

let lockContract = fs.readFileSync('src/services/kairaConversationStateLockContracts.test.ts', 'utf8');
lockContract = lockContract.replace('    expect(server).toContain("responseStylePersonality = responsePersonality");', '    expect(server).not.toContain("responseStylePersonality");\n    expect(server).toContain("computeKairoSpeechIdentity(\\n        responsePersonality,");');
fs.writeFileSync('src/services/kairaConversationStateLockContracts.test.ts', lockContract);

console.log('Removed responseStylePersonality passthrough alias');
