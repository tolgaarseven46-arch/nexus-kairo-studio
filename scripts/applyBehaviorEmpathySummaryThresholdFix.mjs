import fs from 'node:fs';

const enginePath = 'src/services/droitBehaviorEngine.ts';
let engine = fs.readFileSync(enginePath, 'utf8');
const stale = "if (effectiveEmpathy >= 75) traitsSummaryList.push('Yüksek Empati');";
const fixed = "if (effectiveEmpathy >= 0.75) traitsSummaryList.push('Yüksek Empati');";
if (!engine.includes(stale) && !engine.includes(fixed)) {
  throw new Error('empathy summary threshold anchor not found');
}
engine = engine.replace(stale, fixed);
fs.writeFileSync(enginePath, engine);

const testPath = 'src/services/kairaBehaviorEmpathySummaryThresholdContracts.test.ts';
const test = `import { describe, expect, it } from 'vitest';\nimport { computeBehaviorProfile } from './droitBehaviorEngine';\n\ndescribe('behavior empathy summary normalized threshold', () => {\n  it('marks high empathy at the normalized 0.75 boundary', () => {\n    const profile = computeBehaviorProfile({ empathy: 75, humor: 0, selfConfidence: 50, authority: 50, patience: 50, anger: 50, curiosity: 50, analyticalThinking: 50, creativity: 50, decisionMaking: 50, attention: 50, seriousness: 50 }, 'normal mesaj');\n    expect(profile.empathyLevel).toBe(0.75);\n    expect(profile.dominantSummary).toContain('Yüksek Empati');\n  });\n\n  it('does not mark empathy below the boundary', () => {\n    const profile = computeBehaviorProfile({ empathy: 74, humor: 0, selfConfidence: 50, authority: 50, patience: 50, anger: 50, curiosity: 50, analyticalThinking: 50, creativity: 50, decisionMaking: 50, attention: 50, seriousness: 50 }, 'normal mesaj');\n    expect(profile.empathyLevel).toBe(0.74);\n    expect(profile.dominantSummary).not.toContain('Yüksek Empati');\n  });\n});\n`;
fs.writeFileSync(testPath, test);
console.log('Fixed normalized empathy threshold in behavior dominant summary');
