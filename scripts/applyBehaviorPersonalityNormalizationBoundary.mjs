import fs from 'node:fs';

const enginePath = 'src/services/droitBehaviorEngine.ts';
let engine = fs.readFileSync(enginePath, 'utf8');
if (!engine.includes("from '../types/nexus';")) throw new Error('engine type import anchor missing');
if (!engine.includes("from './droitPersonalityNormalizer'")) {
  engine = engine.replace("} from '../types/nexus';", "} from '../types/nexus';\nimport { normalizeDroitPersonality } from './droitPersonalityNormalizer';");
}
engine = engine.replace(
  "  const safeTraits = traits || {};\n  // Extract normalized trait values (0 to 100, default 50)",
  "  const safeTraits = normalizeDroitPersonality(traits);\n  // Extract canonical normalized trait values (0 to 100, default 50)",
);
if (!engine.includes('const safeTraits = normalizeDroitPersonality(traits);')) throw new Error('behavior normalization boundary missing');
fs.writeFileSync(enginePath, engine);

const testPath = 'src/services/kairaBehaviorPersonalityNormalizationBoundaryContracts.test.ts';
const test = `import { describe, expect, it } from 'vitest';\nimport { computeBehaviorProfile } from './droitBehaviorEngine';\n\ndescribe('behavior personality normalization boundary', () => {\n  it('clamps direct out-of-range personality values before behavior synthesis', () => {\n    const profile = computeBehaviorProfile({ empathy: 150, humor: -20, anger: 200, patience: -5 }, 'normal mesaj');\n    expect(profile.empathyLevel).toBe(1);\n    expect(profile.humorLevel).toBe(0);\n    expect(profile.temperLevel).toBe(1);\n    expect(profile.patienceLevel).toBe(0);\n  });\n\n  it('replaces non-finite direct values with canonical neutral defaults', () => {\n    const profile = computeBehaviorProfile({ empathy: Number.NaN, humor: Number.POSITIVE_INFINITY }, 'normal mesaj');\n    expect(profile.empathyLevel).toBe(0.5);\n    expect(profile.humorLevel).toBe(0.5);\n  });\n});\n`;
fs.writeFileSync(testPath, test);
console.log('Installed canonical personality normalization at behavior engine boundary');
