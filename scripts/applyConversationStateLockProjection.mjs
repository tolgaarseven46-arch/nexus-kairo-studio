import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let server = fs.readFileSync('server.ts', 'utf8');
server = once(
  server,
  'import { applyConversationStateAuthority } from "./src/services/conversationStateAuthority";\n',
  'import { projectConversationStateLock } from "./src/services/conversationStateLock";\n',
  'server state lock import',
);
server = once(
  server,
  '      conversationAuthority = applyConversationStateAuthority(responsePersonality, kdm.nextDynamicState),\n      authoritativePersonality = conversationAuthority.personality,',
  '      conversationStateLock = projectConversationStateLock(kdm.nextDynamicState),\n      responseStylePersonality = responsePersonality,',
  'server state lock projection',
);
server = server.replaceAll('authoritativePersonality', 'responseStylePersonality');
server = server.replaceAll(
  'conversationAuthority: { state: conversationAuthority.state, locked: conversationAuthority.locked, reason: conversationAuthority.reason }',
  'conversationAuthority: { state: conversationStateLock.state, locked: conversationStateLock.locked, reason: conversationStateLock.reason }',
);
if (server.includes('applyConversationStateAuthority') || server.includes('authoritativePersonality')) {
  throw new Error('Legacy conversation authority live alias remains in server');
}
fs.writeFileSync('server.ts', server);

let seam = fs.readFileSync('src/services/kairaStateBehaviorContracts.ts', 'utf8');
seam = once(
  seam,
  'import type { ConversationStateAuthorityResult } from "./conversationStateAuthority";\n',
  'import type { ConversationStateLockResult } from "./conversationStateLock";\n',
  'state behavior lock type import',
);
seam = seam.replaceAll('validateConversationAuthorityContract', 'validateConversationStateLockContract');
seam = seam.replaceAll('authority: ConversationStateAuthorityResult', 'stateLock: ConversationStateLockResult');
seam = seam.replaceAll('authority.state', 'stateLock.state');
seam = seam.replaceAll('authority.locked', 'stateLock.locked');
seam = seam.replaceAll('Authority state=', 'State lock=');
seam = seam.replaceAll('authority state=', 'state lock=');
seam = seam.replaceAll('authority lock', 'state lock');
seam = seam.replaceAll('authority tarafından kilitlenmelidir', 'state lock tarafından kilitlenmelidir');
seam = seam.replaceAll('  authority: ConversationStateLockResult;', '  stateLock: ConversationStateLockResult;');
seam = seam.replaceAll('input.authority', 'input.stateLock');
fs.writeFileSync('src/services/kairaStateBehaviorContracts.ts', seam);

let seamTest = fs.readFileSync('src/services/kairaStateBehaviorContracts.test.ts', 'utf8');
seamTest = seamTest.replace(
  'import { applyConversationStateAuthority } from "./conversationStateAuthority";',
  'import { projectConversationStateLock } from "./conversationStateLock";',
);
seamTest = seamTest.replaceAll('const authority = applyConversationStateAuthority(personality, dynamicState);', 'const stateLock = projectConversationStateLock(dynamicState);');
seamTest = seamTest.replaceAll('validateStateBehaviorSeam({ state: dynamicState, behavior, authority })', 'validateStateBehaviorSeam({ state: dynamicState, behavior, stateLock })');
seamTest = seamTest.replaceAll('expect(authority.locked)', 'expect(stateLock.locked)');
seamTest = seamTest.replaceAll('expect(authority.personality).toBe(personality);\n', '');
fs.writeFileSync('src/services/kairaStateBehaviorContracts.test.ts', seamTest);

let sequenceTest = fs.readFileSync('src/services/kairaStateSequenceContracts.test.ts', 'utf8');
sequenceTest = sequenceTest.replace(
  'import { applyConversationStateAuthority } from "./conversationStateAuthority";',
  'import { projectConversationStateLock } from "./conversationStateLock";',
);
sequenceTest = sequenceTest.replaceAll('const authority = applyConversationStateAuthority(personality, next);', 'const stateLock = projectConversationStateLock(next);');
sequenceTest = sequenceTest.replaceAll('validateStateBehaviorSeam({ state: next, behavior, authority })', 'validateStateBehaviorSeam({ state: next, behavior, stateLock })');
sequenceTest = sequenceTest.replaceAll('authority.locked', 'stateLock.locked');
fs.writeFileSync('src/services/kairaStateSequenceContracts.test.ts', sequenceTest);

let nonMutation = fs.readFileSync('src/services/kairaConversationAuthorityNonMutationContracts.test.ts', 'utf8');
nonMutation = nonMutation.replace('import { applyConversationStateAuthority } from "./conversationStateAuthority";\n', 'import { projectConversationStateLock } from "./conversationStateLock";\n');
nonMutation = nonMutation.replace(/import type \{ DroitDynamicState, DroitPersonalityTraits \} from "\.\.\/types\/nexus";/u, 'import type { DroitDynamicState } from "../types/nexus";');
nonMutation = nonMutation.replace(/\nconst personality = \{[\s\S]*?\} as unknown as DroitPersonalityTraits;\n/u, '\n');
nonMutation = nonMutation.replaceAll('const result = applyConversationStateAuthority(personality, state(conversationState));', 'const result = projectConversationStateLock(state(conversationState));');
nonMutation = nonMutation.replaceAll('      expect(result.personality).toBe(personality);\n      expect(result.personality.humor).toBe(80);\n', '      expect(result).not.toHaveProperty("personality");\n');
fs.writeFileSync('src/services/kairaConversationAuthorityNonMutationContracts.test.ts', nonMutation);

let legacy = fs.readFileSync('src/services/kairaLegacyRuntimeFlagRemovalContracts.test.ts', 'utf8');
legacy = legacy.replace('const conversationAuthority = read("src/services/conversationStateAuthority.ts");', 'const conversationStateLock = read("src/services/conversationStateLock.ts");');
legacy = legacy.replaceAll('conversationAuthority', 'conversationStateLock');
legacy = legacy.replace('    expect(conversationStateLock).toContain("personality,");\n', '    expect(conversationStateLock).not.toContain("personality");\n');
fs.writeFileSync('src/services/kairaLegacyRuntimeFlagRemovalContracts.test.ts', legacy);

const oldTest = 'src/services/conversationStateAuthority.test.ts';
const newTest = 'src/services/conversationStateLock.test.ts';
const lockTest = `import { describe, expect, it } from "vitest";\nimport type { DroitDynamicState } from "../types/nexus";\nimport { projectConversationStateLock } from "./conversationStateLock";\n\nconst state = (conversationState: "active" | "distancing" | "disengaged" | "repairing") => ({\n  calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10,\n  relationship: { conversationState },\n}) as DroitDynamicState;\n\ndescribe("conversation state lock projection", () => {\n  it("leaves active unlocked", () => {\n    const result = projectConversationStateLock(state("active"));\n    expect(result.locked).toBe(false);\n  });\n  it.each(["distancing", "repairing", "disengaged"] as const)("locks %s", (value) => {\n    const result = projectConversationStateLock(state(value));\n    expect(result.state).toBe(value);\n    expect(result.locked).toBe(true);\n  });\n});\n`;
fs.writeFileSync(newTest, lockTest);
if (fs.existsSync(oldTest)) fs.unlinkSync(oldTest);

console.log('Conversation state authority reduced to pure lock projection');
