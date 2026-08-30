import fs from 'node:fs';

const path = 'src/services/kdmConsistencyEngine.ts';
let source = fs.readFileSync(path, 'utf8');
if (!source.includes("from './droitPersonalityNormalizer'")) {
  source = source.replace(
    'import {\n  computeBehaviorProfile,\n  BehaviorLayerProfile,\n} from "./droitBehaviorEngine";',
    'import {\n  computeBehaviorProfile,\n  BehaviorLayerProfile,\n} from "./droitBehaviorEngine";\nimport { normalizeDroitPersonality } from "./droitPersonalityNormalizer";',
  );
}
source = source.replace(
  '  const semanticEvent = canonicalSemanticEvent ?? interpretSemanticEvent(userMessage);\n  const baseBehaviorProfile = computeBehaviorProfile(personality || undefined, userMessage);',
  '  const semanticEvent = canonicalSemanticEvent ?? interpretSemanticEvent(userMessage);\n  const normalizedPersonality = normalizeDroitPersonality(personality);\n  const baseBehaviorProfile = computeBehaviorProfile(normalizedPersonality, userMessage);',
);
source = source.replace('  const patience = trait(personality, "patience");', '  const patience = trait(normalizedPersonality, "patience");');
source = source.replace('  const sensitivity = trait(personality, "emotionalSensitivity");', '  const sensitivity = trait(normalizedPersonality, "emotionalSensitivity");');
source = source.replace('  const angerTrait = trait(personality, "anger");', '  const angerTrait = trait(normalizedPersonality, "anger");');
source = source.replace('  const empathy = trait(personality, "empathy");', '  const empathy = trait(normalizedPersonality, "empathy");');
source = source.replace('  const loyalty = trait(personality, "loyalty");', '  const loyalty = trait(normalizedPersonality, "loyalty");');
if (!source.includes('const normalizedPersonality = normalizeDroitPersonality(personality);')) throw new Error('KDM normalization boundary missing');
fs.writeFileSync(path, source);

const testPath = 'src/services/kairaKdmPersonalityNormalizationBoundaryContracts.test.ts';
const test = `import { describe, expect, it } from 'vitest';\nimport { analyzeKdmInteraction } from './kdmConsistencyEngine';\n\ndescribe('KDM personality normalization boundary', () => {\n  it('keeps direct KDM state math finite for non-finite personality input', () => {\n    const result = analyzeKdmInteraction('normal mesaj', { patience: Number.NaN, empathy: Number.POSITIVE_INFINITY, anger: Number.NaN, loyalty: Number.NEGATIVE_INFINITY });\n    expect(Number.isFinite(result.nextDynamicState.stress)).toBe(true);\n    expect(Number.isFinite(result.nextDynamicState.happiness)).toBe(true);\n    expect(Number.isFinite(result.nextDynamicState.anger)).toBe(true);\n    expect(Number.isFinite(result.trace.relationship.toleranceMultiplier)).toBe(true);\n  });\n\n  it('clamps direct out-of-range personality before KDM relationship math', () => {\n    const result = analyzeKdmInteraction('salaksın', { patience: -100, empathy: 200, anger: 200, emotionalSensitivity: 200, loyalty: 200 });\n    expect(result.behaviorProfile.patienceLevel).toBe(0);\n    expect(result.behaviorProfile.empathyLevel).toBe(1);\n    expect(result.behaviorProfile.temperLevel).toBe(1);\n    expect(Number.isFinite(result.trace.relationship.toleranceMultiplier)).toBe(true);\n  });\n});\n`;
fs.writeFileSync(testPath, test);
console.log('Installed canonical personality normalization at KDM boundary');
