import fs from 'node:fs';

function replace(path, from, to) {
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`missing marker in ${path}: ${from.slice(0, 100)}`);
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
}

const policyPath = 'src/services/behaviorPolicyInput.ts';
replace(
  policyPath,
  'import type {\n  BehaviorIntegrationResult,\n  IntegratedBehaviorDecision,\n} from "./behaviorIntegrationEngine";\n',
  'import type {\n  BehaviorIntegrationResult,\n  IntegratedBehaviorDecision,\n} from "./behaviorIntegrationEngine";\nimport type { ExpressionStyleResponse } from "./expressionStyleEngine";\n',
);
replace(
  policyPath,
  'export interface BehaviorPolicyInput {\n  schemaVersion: typeof BEHAVIOR_POLICY_SCHEMA_VERSION;\n  source: typeof CLIENT_BEHAVIOR_POLICY_SOURCE;\n  decision: IntegratedBehaviorDecision;\n  pressures?: BehaviorIntegrationResult["pressures"];\n}\n',
  'export interface ExpressionStylePolicyHints {\n  humorMode: ExpressionStyleResponse["humor"]["dominantMode"];\n  informality: number;\n  emotionalDisplay: number;\n}\n\nexport interface BehaviorPolicyInput {\n  schemaVersion: typeof BEHAVIOR_POLICY_SCHEMA_VERSION;\n  source: typeof CLIENT_BEHAVIOR_POLICY_SOURCE;\n  decision: IntegratedBehaviorDecision;\n  pressures?: BehaviorIntegrationResult["pressures"];\n  expressionStyle?: ExpressionStylePolicyHints;\n}\n',
);
replace(
  policyPath,
  'const LENGTHS = new Set<IntegratedBehaviorDecision["responseLength"]>([\n  "short",\n  "medium",\n  "long",\n]);\n',
  'const LENGTHS = new Set<IntegratedBehaviorDecision["responseLength"]>([\n  "short",\n  "medium",\n  "long",\n]);\nconst HUMOR_MODES = new Set<Exclude<ExpressionStyleResponse["humor"]["dominantMode"], null>>([\n  "absurd",\n  "irony",\n  "sarcasm",\n  "dark",\n  "affiliative",\n  "aggressive",\n  "selfDirected",\n  "wordplay",\n]);\n',
);
replace(
  policyPath,
  'export function createClientBehaviorPolicy(\n  decision: IntegratedBehaviorDecision,\n  pressures?: BehaviorIntegrationResult["pressures"],\n): BehaviorPolicyInput {\n  return {\n    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,\n    source: CLIENT_BEHAVIOR_POLICY_SOURCE,\n    decision,\n    ...(pressures ? { pressures } : {}),\n  };\n}\n',
  'export function createClientBehaviorPolicy(\n  decision: IntegratedBehaviorDecision,\n  pressures?: BehaviorIntegrationResult["pressures"],\n  expressionStyle?: ExpressionStyleResponse,\n): BehaviorPolicyInput {\n  return {\n    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,\n    source: CLIENT_BEHAVIOR_POLICY_SOURCE,\n    decision,\n    ...(pressures ? { pressures } : {}),\n    ...(expressionStyle\n      ? {\n          expressionStyle: {\n            humorMode: expressionStyle.humor.dominantMode,\n            informality: finite01(expressionStyle.speech.informality, 0.5),\n            emotionalDisplay: finite01(expressionStyle.speech.emotionalDisplay, 0.5),\n          },\n        }\n      : {}),\n  };\n}\n',
);
replace(
  policyPath,
  '  const pressures = raw.pressures && typeof raw.pressures === "object"\n    ? {\n        boundary: finite01(raw.pressures.boundary),\n        values: finite01(raw.pressures.values),\n        relationship: finite01(raw.pressures.relationship),\n        approach: finite01(raw.pressures.approach),\n        withdrawal: finite01(raw.pressures.withdrawal),\n        engagement: finite01(raw.pressures.engagement),\n        humor: finite01(raw.pressures.humor),\n      }\n    : undefined;\n\n  return {\n    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,\n    source: CLIENT_BEHAVIOR_POLICY_SOURCE,\n    decision: normalizedDecision,\n    ...(pressures ? { pressures } : {}),\n  };\n',
  '  const pressures = raw.pressures && typeof raw.pressures === "object"\n    ? {\n        boundary: finite01(raw.pressures.boundary),\n        values: finite01(raw.pressures.values),\n        relationship: finite01(raw.pressures.relationship),\n        approach: finite01(raw.pressures.approach),\n        withdrawal: finite01(raw.pressures.withdrawal),\n        engagement: finite01(raw.pressures.engagement),\n        humor: finite01(raw.pressures.humor),\n      }\n    : undefined;\n\n  const rawExpressionStyle = raw.expressionStyle && typeof raw.expressionStyle === "object"\n    ? raw.expressionStyle as Record<string, any>\n    : undefined;\n  const rawHumorMode = rawExpressionStyle?.humorMode;\n  const expressionStyle: ExpressionStylePolicyHints | undefined = rawExpressionStyle\n    ? {\n        humorMode: rawHumorMode === null || HUMOR_MODES.has(rawHumorMode) ? rawHumorMode : null,\n        informality: finite01(rawExpressionStyle.informality, 0.5),\n        emotionalDisplay: finite01(rawExpressionStyle.emotionalDisplay, 0.5),\n      }\n    : undefined;\n\n  return {\n    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,\n    source: CLIENT_BEHAVIOR_POLICY_SOURCE,\n    decision: normalizedDecision,\n    ...(pressures ? { pressures } : {}),\n    ...(expressionStyle ? { expressionStyle } : {}),\n  };\n',
);

const chatPath = 'src/services/droitChatService.ts';
replace(
  chatPath,
  '    const behaviorPolicy = createClientBehaviorPolicy(\n      integrationRuntime.decision,\n      integrationRuntime.pressures,\n    );',
  '    const behaviorPolicy = createClientBehaviorPolicy(\n      integrationRuntime.decision,\n      integrationRuntime.pressures,\n      expressionRuntime.response,\n    );',
);

const speechPath = 'src/services/kairoSpeechIdentity.ts';
replace(
  speechPath,
  '} from "../types/nexus";\n',
  '} from "../types/nexus";\nimport type { ExpressionStylePolicyHints } from "./behaviorPolicyInput";\n',
);
replace(
  speechPath,
  '  directness: number;\n  rhythm: KairoWritingRhythm;\n',
  '  directness: number;\n  informalityLevel: number;\n  emotionalDisplayLevel: number;\n  humorMode: ExpressionStylePolicyHints["humorMode"];\n  rhythm: KairoWritingRhythm;\n',
);
replace(
  speechPath,
  'export function computeKairoSpeechIdentity(\n  personality: DroitPersonalityTraits,\n  state: DroitDynamicState,\n  trace: ReasoningTrace,\n): KairoSpeechIdentity {',
  'export function computeKairoSpeechIdentity(\n  personality: DroitPersonalityTraits,\n  state: DroitDynamicState,\n  trace: ReasoningTrace,\n  expressionStyle?: ExpressionStylePolicyHints,\n): KairoSpeechIdentity {',
);
replace(
  speechPath,
  '  const coreSlang = clamp(35 + personality.communication * 0.25 + personality.humor * 0.2 - personality.seriousness * 0.25);\n',
  '  const informalityLevel = clamp((expressionStyle?.informality ?? 0.5) * 100);\n  const emotionalDisplayLevel = clamp((expressionStyle?.emotionalDisplay ?? 0.5) * 100);\n  const coreSlang = clamp(35 + personality.communication * 0.25 + personality.humor * 0.2 - personality.seriousness * 0.25 + (informalityLevel - 50) * 0.5);\n',
);
replace(
  speechPath,
  '  const instructions = [\n',
  '  const humorModeInstruction = expressionStyle?.humorMode\n    ? `Mizah izni açılırsa tercih edilen mizah biçimi: ${expressionStyle.humorMode}. Bu biçimi zorla kullanma.`\n    : "Belirli bir mizah biçimini zorla seçme.";\n  const emotionalDisplayInstruction = emotionalDisplayLevel >= 70\n    ? "Duyguyu dilde belirgin ama teatral olmayan biçimde görünür kıl."\n    : emotionalDisplayLevel <= 30\n      ? "Duyguyu dilde fazla teşhir etme; daha kontrollü ve örtük ifade et."\n      : "Duygu gösterimini doğal ve orta düzeyde tut.";\n\n  const instructions = [\n',
);
replace(
  speechPath,
  '    humor >= 65 ? "Mizah kullanılmasına davranış planı izin verirse, espriyi açıklamadan kısa ve gündelik tut." : "Mizah tonu gerekiyorsa bile zorlamadan hafif tut.",\n    "Emoji kullanılmasına davranış planı izin verirse seyrek kullan; stil eğilimi düşük kalsın.",',
  '    humor >= 65 ? "Mizah kullanılmasına davranış planı izin verirse, espriyi açıklamadan kısa ve gündelik tut." : "Mizah tonu gerekiyorsa bile zorlamadan hafif tut.",\n    humorModeInstruction,\n    emotionalDisplayInstruction,\n    "Emoji kullanılmasına davranış planı izin verirse seyrek kullan; stil eğilimi düşük kalsın.",',
);
replace(
  speechPath,
  '  return { register, relationshipLevel, sentenceLength, slangLevel: slang, humorLevel: humor, emojiLevel, warmthLevel, directness, rhythm: KAIRA_WRITING_RHYTHM, instructions };\n',
  '  return { register, relationshipLevel, sentenceLength, slangLevel: slang, humorLevel: humor, emojiLevel, warmthLevel, directness, informalityLevel, emotionalDisplayLevel, humorMode: expressionStyle?.humorMode ?? null, rhythm: KAIRA_WRITING_RHYTHM, instructions };\n',
);
replace(
  speechPath,
  'Doğrudanlık: %${speech.directness}\nRitim: kısa-öncelikli, gerektiğinde bölünmüş, gündelik sohbette az noktalı\n',
  'Doğrudanlık: %${speech.directness}\nSamimiyet / argo eğilimi: %${speech.informalityLevel}\nDuygu gösterimi: %${speech.emotionalDisplayLevel}\nTercih edilen mizah biçimi: ${speech.humorMode ?? "yok"}\nRitim: kısa-öncelikli, gerektiğinde bölünmüş, gündelik sohbette az noktalı\n',
);

const serverPath = 'server.ts';
replace(
  serverPath,
  '      speech = computeKairoSpeechIdentity(\n        responsePersonality,\n        kdm.nextDynamicState,\n        kdm.trace,\n      ),',
  '      speech = computeKairoSpeechIdentity(\n        responsePersonality,\n        kdm.nextDynamicState,\n        kdm.trace,\n        behaviorPolicy?.expressionStyle,\n      ),',
);

const testPath = 'src/services/kairaExpressionPolicyHintsContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport { createClientBehaviorPolicy, normalizeBehaviorPolicyInput } from './behaviorPolicyInput';\nimport { computeExpressionStyle, DEFAULT_EXPRESSION_STYLE_PROFILE } from './expressionStyleEngine';\nimport { computeKairoSpeechIdentity } from './kairoSpeechIdentity';\nimport type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from '../types/nexus';\n\nconst decision = { priority: 'expression' as const, continueConversation: true, humorAllowed: true, askQuestion: true, acknowledgeComplaint: false, repairAllowed: true, stance: 'neutral' as const, responseLength: 'medium' as const, directness: 0.5, warmth: 0.5, distance: 0, explanation: [] };\nconst personality = { humor: 60, communication: 50, seriousness: 40, authority: 50, decisionMaking: 50, empathy: 50 } as DroitPersonalityTraits;\nconst state = { anger: 0, stress: 0, happiness: 50, calmness: 50, confidence: 50, surprise: 0 } as DroitDynamicState;\nconst trace = { messageInterpretation: { sentiment: 'nötr' } } as ReasoningTrace;\n\ndescribe('expression style policy hints', () => {\n  it('preserves normalized HOW hints without changing behavior-policy schema version', () => {\n    const expression = computeExpressionStyle({ ...DEFAULT_EXPRESSION_STYLE_PROFILE, irony: 100, absurd: 0, sarcasm: 0, dark: 0, affiliative: 0, aggressive: 0, selfDirected: 0, wordplay: 0, informality: 90, emotionalDisplay: 80 }, 'şaka yapalım');\n    const policy = createClientBehaviorPolicy(decision, undefined, expression);\n    expect(policy.schemaVersion).toBe('behavior-policy@1');\n    const normalized = normalizeBehaviorPolicyInput(policy);\n    expect(normalized?.expressionStyle?.humorMode).toBe('irony');\n    expect(normalized?.expressionStyle?.informality).toBeCloseTo(0.9);\n    expect(normalized?.expressionStyle?.emotionalDisplay).toBeCloseTo(0.8);\n  });\n\n  it('makes informality and emotional display visible in speech identity', () => {\n    const low = computeKairoSpeechIdentity(personality, state, trace, { humorMode: null, informality: 0.1, emotionalDisplay: 0.1 });\n    const high = computeKairoSpeechIdentity(personality, state, trace, { humorMode: 'wordplay', informality: 0.9, emotionalDisplay: 0.9 });\n    expect(high.slangLevel).toBeGreaterThan(low.slangLevel);\n    expect(high.informalityLevel).toBe(90);\n    expect(high.emotionalDisplayLevel).toBe(90);\n    expect(high.humorMode).toBe('wordplay');\n    expect(high.instructions.join(' ')).toContain('wordplay');\n  });\n\n  it('clamps untrusted server-bound style hints and drops invalid humor modes', () => {\n    const normalized = normalizeBehaviorPolicyInput({ schemaVersion: 'behavior-policy@1', source: 'client_behavior_integration', decision, expressionStyle: { humorMode: 'invalid-mode', informality: 9, emotionalDisplay: -3 } });\n    expect(normalized?.expressionStyle).toEqual({ humorMode: null, informality: 1, emotionalDisplay: 0 });\n  });\n});\n`);

for (const [path, markers] of Object.entries({
  [policyPath]: ['expressionStyle?: ExpressionStylePolicyHints', 'HUMOR_MODES', 'expressionStyle: {'],
  [chatPath]: ['expressionRuntime.response'],
  [speechPath]: ['informalityLevel', 'emotionalDisplayLevel', 'humorModeInstruction'],
  [serverPath]: ['behaviorPolicy?.expressionStyle'],
  [testPath]: ['expression style policy hints'],
})) {
  const source = fs.readFileSync(path, 'utf8');
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`missing final marker ${marker} in ${path}`);
}
console.log('Wired expression HOW hints through behavior policy into server speech identity');
