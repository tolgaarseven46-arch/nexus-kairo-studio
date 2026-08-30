import fs from 'node:fs';

let integration = fs.readFileSync('src/services/behaviorIntegrationEngine.ts', 'utf8');

for (const block of [
  `const stanceCode: Record<IntegratedBehaviorDecision["stance"], number> = {\n  warm: 0,\n  neutral: 25,\n  firm: 50,\n  distant: 75,\n  disengage: 100,\n};\n`,
  `const lengthCode: Record<IntegratedBehaviorDecision["responseLength"], number> = { short: 25, medium: 50, long: 75 };\n`,
  `const priorityCode: Record<IntegratedBehaviorDecision["priority"], number> = {\n  expression: 20, preference: 35, goal: 50, relationship: 65, values: 82, boundary: 100,\n};\n`,
]) integration = integration.replace(block, '');

const runtimeLines = [
  '    runtimeContinueConversation: decision.continueConversation ? 100 : 0,\n',
  '    runtimeHumorAllowed: decision.humorAllowed ? 100 : 0,\n',
  '    runtimeAskQuestion: decision.askQuestion ? 100 : 0,\n',
  '    runtimeAcknowledgeComplaint: decision.acknowledgeComplaint ? 100 : 0,\n',
  '    runtimeRepairAllowed: decision.repairAllowed ? 100 : 0,\n',
  '    runtimeStance: stanceCode[decision.stance],\n',
  '    runtimeResponseLength: lengthCode[decision.responseLength],\n',
  '    runtimeDirectness: clamp100(decision.directness * 100),\n',
  '    runtimeWarmth: clamp100(decision.warmth * 100),\n',
  '    runtimeDistance: clamp100(decision.distance * 100),\n',
  '    runtimePriority: priorityCode[decision.priority],\n',
  '    runtimePriorConversationState: priorDisengaged ? 100 : priorRepairing ? 75 : priorConversationState === "distancing" ? 50 : 0,\n',
  '    runtimeRepairSignal: repairSignal ? 100 : 0,\n',
];
for (const line of runtimeLines) integration = integration.replace(line, '');
const remainingRuntimeFields = integration.match(/runtime[A-Z][A-Za-z]+:/g) || [];
if (remainingRuntimeFields.length) throw new Error(`Legacy runtime fields remain in behaviorIntegrationEngine: ${remainingRuntimeFields.join(', ')}`);
fs.writeFileSync('src/services/behaviorIntegrationEngine.ts', integration);

let authority = fs.readFileSync('src/services/conversationStateAuthority.ts', 'utf8');
authority = authority.replace('const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));\n', '');
authority = authority.replace(/const readNumber = \(personality: DroitPersonalityTraits, key: string, fallback: number\) => \{[\s\S]*?\};\n\n/u, '');

authority = authority.replace(
`      personality: {\n        ...base,\n        humor: 0,\n        runtimeContinueConversation: 0,\n        runtimeHumorAllowed: 0,\n        runtimeAskQuestion: 0,\n        runtimeRepairAllowed: 0,\n        runtimeStance: 100,\n        runtimeResponseLength: 25,\n        runtimeWarmth: 0,\n        runtimeDistance: 100,\n        runtimePriority: 100,\n      },`,
`      personality: {\n        ...base,\n        humor: 0,\n      },`,
);

authority = authority.replace(
`      personality: {\n        ...base,\n        humor: 0,\n        runtimeContinueConversation: 100,\n        runtimeHumorAllowed: 0,\n        runtimeAskQuestion: 0,\n        runtimeStance: Math.max(75, readNumber(base, "runtimeStance", 75)),\n        runtimeResponseLength: 25,\n        runtimeWarmth: Math.min(24, readNumber(base, "runtimeWarmth", 24)),\n        runtimeDistance: Math.max(70, readNumber(base, "runtimeDistance", 70)),\n        runtimePriority: Math.max(65, readNumber(base, "runtimePriority", 65)),\n      },`,
`      personality: {\n        ...base,\n        humor: 0,\n      },`,
);

authority = authority.replace(
`    personality: {\n      ...base,\n      humor: Math.min(20, clamp100(readNumber(base, "humor", 0))),\n      runtimeHumorAllowed: 0,\n      runtimeStance: Math.max(75, readNumber(base, "runtimeStance", 75)),\n      runtimeWarmth: Math.min(35, readNumber(base, "runtimeWarmth", 35)),\n      runtimeDistance: Math.max(60, readNumber(base, "runtimeDistance", 60)),\n      runtimePriority: Math.max(65, readNumber(base, "runtimePriority", 65)),\n    },`,
`    personality: {\n      ...base,\n      humor: Math.min(20, base.humor ?? 0),\n    },`,
);

if (/runtime[A-Z]/u.test(authority)) throw new Error('Legacy runtime decision field remains in conversationStateAuthority');
fs.writeFileSync('src/services/conversationStateAuthority.ts', authority);

let integrationTest = fs.readFileSync('src/services/behaviorIntegrationEngine.test.ts', 'utf8');
integrationTest = integrationTest.replace('    expect(result.personality.runtimeContinueConversation).toBe(0);\n    expect(result.personality.runtimePriority).toBe(100);\n', '    expect(result.decision.continueConversation).toBe(false);\n    expect(result.decision.priority).toBe("boundary");\n');
integrationTest = integrationTest.replace('    expect(result.personality.runtimeAskQuestion).toBe(0);\n', '    expect(result.decision.askQuestion).toBe(false);\n');
fs.writeFileSync('src/services/behaviorIntegrationEngine.test.ts', integrationTest);

let authorityTest = fs.readFileSync('src/services/conversationStateAuthority.test.ts', 'utf8');
authorityTest = authorityTest.replace(
`const personality = {\n  humor: 80,\n  runtimeContinueConversation: 100,\n  runtimeHumorAllowed: 100,\n  runtimeAskQuestion: 100,\n  runtimeStance: 0,\n  runtimeWarmth: 90,\n  runtimeDistance: 0,\n  runtimePriority: 20,\n} as unknown as DroitPersonalityTraits;`,
`const personality = {\n  humor: 80,\n} as unknown as DroitPersonalityTraits;`,
);
authorityTest = authorityTest.replace('    expect(result.personality.runtimeHumorAllowed).toBe(100);\n', '    expect(result.personality.humor).toBe(80);\n');
authorityTest = authorityTest.replace(
`    expect(result.personality.runtimeHumorAllowed).toBe(0);\n    expect(result.personality.runtimeStance).toBeGreaterThanOrEqual(75);\n    expect(result.personality.runtimeWarmth).toBeLessThanOrEqual(35);\n    expect(result.personality.runtimeDistance).toBeGreaterThanOrEqual(60);\n`,
`    expect(result.personality.humor).toBeLessThanOrEqual(20);\n`,
);
authorityTest = authorityTest.replace(
`    expect(result.personality.runtimeContinueConversation).toBe(100);\n    expect(result.personality.runtimeHumorAllowed).toBe(0);\n    expect(result.personality.runtimeAskQuestion).toBe(0);\n    expect(result.personality.runtimeWarmth).toBeLessThanOrEqual(24);\n`,
`    expect(result.personality.humor).toBe(0);\n`,
);
authorityTest = authorityTest.replace(
`    expect(result.personality.runtimeContinueConversation).toBe(0);\n    expect(result.personality.runtimeHumorAllowed).toBe(0);\n    expect(result.personality.runtimeAskQuestion).toBe(0);\n    expect(result.personality.runtimeStance).toBe(100);\n    expect(result.personality.runtimeDistance).toBe(100);\n`,
`    expect(result.personality.humor).toBe(0);\n`,
);
fs.writeFileSync('src/services/conversationStateAuthority.test.ts', authorityTest);

console.log('Legacy runtime decision flags removed from live response personality path');
