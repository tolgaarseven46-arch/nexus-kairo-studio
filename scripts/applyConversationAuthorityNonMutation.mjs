import fs from 'node:fs';

const authorityPath = 'src/services/conversationStateAuthority.ts';
const authority = `import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";\n\nexport type ConversationAuthorityState = "active" | "distancing" | "disengaged" | "repairing";\n\nexport interface ConversationStateAuthorityResult {\n  state: ConversationAuthorityState;\n  personality: DroitPersonalityTraits;\n  locked: boolean;\n  reason: string;\n}\n\nexport function applyConversationStateAuthority(\n  personality: DroitPersonalityTraits,\n  dynamicState?: DroitDynamicState | null,\n): ConversationStateAuthorityResult {\n  const state = (dynamicState?.relationship?.conversationState ?? "active") as ConversationAuthorityState;\n  if (state === "active") {\n    return { state, personality, locked: false, reason: "İlişki aktif; state lock yok." };\n  }\n  if (state === "disengaged") {\n    return {\n      state,\n      personality,\n      locked: true,\n      reason: "KDM ilişki reducer'ı disengaged üretti; WHAT/WHETHER kapanışı BehaviorContract ve KairaResponsePlan tarafından uygulanır.",\n    };\n  }\n  if (state === "repairing") {\n    return {\n      state,\n      personality,\n      locked: true,\n      reason: "KDM ilişki reducer'ı repairing üretti; yakınlık ve mizah izinleri canonical plan tarafından sınırlandırılır.",\n    };\n  }\n  return {\n    state,\n    personality,\n    locked: true,\n    reason: "KDM ilişki reducer'ı distancing üretti; davranış izinleri canonical plan tarafından sınırlandırılır.",\n  };\n}\n`;
fs.writeFileSync(authorityPath, authority);

let authorityTest = fs.readFileSync('src/services/conversationStateAuthority.test.ts', 'utf8');
authorityTest = authorityTest.replace(
  '  it("prevents a pre-KDM warm client decision from reopening distancing", () => {\n    const result = applyConversationStateAuthority(personality, state("distancing"));\n    expect(result.locked).toBe(true);\n    expect(result.personality.humor).toBeLessThanOrEqual(20);\n  });',
  '  it("locks distancing without mutating response personality", () => {\n    const result = applyConversationStateAuthority(personality, state("distancing"));\n    expect(result.locked).toBe(true);\n    expect(result.personality).toBe(personality);\n    expect(result.personality.humor).toBe(80);\n  });',
);
authorityTest = authorityTest.replace(
  '  it("keeps repairing controlled instead of restoring normal closeness", () => {\n    const result = applyConversationStateAuthority(personality, state("repairing"));\n    expect(result.personality.humor).toBe(0);\n  });',
  '  it("locks repairing without mutating response personality", () => {\n    const result = applyConversationStateAuthority(personality, state("repairing"));\n    expect(result.locked).toBe(true);\n    expect(result.personality).toBe(personality);\n    expect(result.personality.humor).toBe(80);\n  });',
);
authorityTest = authorityTest.replace(
  '  it("makes disengaged a hard post-transition lock", () => {\n    const result = applyConversationStateAuthority(personality, state("disengaged"));\n    expect(result.personality.humor).toBe(0);\n  });',
  '  it("makes disengaged a hard state lock without mutating response personality", () => {\n    const result = applyConversationStateAuthority(personality, state("disengaged"));\n    expect(result.locked).toBe(true);\n    expect(result.personality).toBe(personality);\n    expect(result.personality.humor).toBe(80);\n  });',
);
fs.writeFileSync('src/services/conversationStateAuthority.test.ts', authorityTest);

let seam = fs.readFileSync('src/services/kairaStateBehaviorContracts.ts', 'utf8');
seam = seam.replace(/\n  if \(relationshipState === "disengaged" && \(authority\.personality\.humor \?\? 0\) !== 0\) \{[\s\S]*?\n  \}\n/u, '\n');
fs.writeFileSync('src/services/kairaStateBehaviorContracts.ts', seam);

let seamTest = fs.readFileSync('src/services/kairaStateBehaviorContracts.test.ts', 'utf8');
seamTest = seamTest.replace('    expect(authority.personality.humor).toBe(0);\n', '    expect(authority.personality).toBe(personality);\n');
fs.writeFileSync('src/services/kairaStateBehaviorContracts.test.ts', seamTest);

console.log('Conversation state authority is now non-mutating state-lock metadata');
