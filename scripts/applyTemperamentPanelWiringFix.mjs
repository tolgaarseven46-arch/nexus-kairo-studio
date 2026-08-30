import fs from 'node:fs';

const enginePath = 'src/services/temperamentEngine.ts';
let source = fs.readFileSync(enginePath, 'utf8');

source = source.replace(
  '  threatSensitivity: number;\n  rewardSensitivity: number;',
  '  threatSensitivity: number;\n  reactivityThreshold: number;\n  rewardSensitivity: number;',
);
source = source.replace(
  '  noveltySeeking: number;\n  attentionPersistence: number;',
  '  noveltySeeking: number;\n  uncertaintyTolerance: number;\n  approachDriveBias: number;\n  attentionPersistence: number;',
);
source = source.replace(
  '  threatSensitivity: 50,\n  rewardSensitivity: 50,',
  '  threatSensitivity: 50,\n  reactivityThreshold: 50,\n  rewardSensitivity: 50,',
);
source = source.replace(
  '  noveltySeeking: 50,\n  attentionPersistence: 50,',
  '  noveltySeeking: 50,\n  uncertaintyTolerance: 50,\n  approachDriveBias: 50,\n  attentionPersistence: 50,',
);
source = source.replace(
  `    threatSensitivity: read(\n      'temperament.sensitivity.threat',\n      'temperament.reactivity.threshold',\n    ),`,
  `    threatSensitivity: read('temperament.sensitivity.threat'),\n    reactivityThreshold: read('temperament.reactivity.threshold'),`,
);
source = source.replace(
  `    noveltySeeking: read(\n      'temperament.exploration.noveltySeeking',\n      'temperament.exploration.noveltySeeking',\n    ),\n    attentionPersistence:`,
  `    noveltySeeking: read('temperament.exploration.noveltySeeking'),\n    uncertaintyTolerance: read('temperament.exploration.uncertaintyTolerance'),\n    approachDriveBias: read('temperament.exploration.approachDrive'),\n    attentionPersistence:`,
);
source = source.replace(
  '  const currentStress = clamp01(input.currentStress);\n\n  const negativeActivation = clamp01(\n    negativeLoad * (0.35 + n(profile.negativeSensitivity) * 0.65),\n  );',
  `  const currentStress = clamp01(input.currentStress);\n  // 50 is neutral/backward-compatible. Higher panel threshold requires more pressure; lower threshold reacts more easily.\n  const thresholdFactor = 0.75 + (1 - n(profile.reactivityThreshold)) * 0.5;\n\n  const negativeActivation = clamp01(\n    negativeLoad * (0.35 + n(profile.negativeSensitivity) * 0.65) * thresholdFactor,\n  );`,
);
source = source.replace(
  '      (0.3 + n(profile.frustrationSensitivity) * 0.7) *\n      (0.75 + repetitionLoad * 0.25),',
  '      (0.3 + n(profile.frustrationSensitivity) * 0.7) *\n      (0.75 + repetitionLoad * 0.25) *\n      thresholdFactor,',
);
source = source.replace(
  '      (0.3 + n(profile.threatSensitivity) * 0.7) *\n      (1 - relationshipSafety * 0.2),',
  '      (0.3 + n(profile.threatSensitivity) * 0.7) *\n      (1 - relationshipSafety * 0.2) *\n      thresholdFactor,',
);
source = source.replace(
  '  const noveltyApproach = noveltyLoad * n(profile.noveltySeeking);\n  const threatAvoidance = threatActivation * (1 - relationshipSafety * 0.25);',
  `  const noveltyApproach =\n    noveltyLoad * n(profile.noveltySeeking) * (0.75 + n(profile.approachDriveBias) * 0.5);\n  const uncertaintyAvoidanceFactor = 1.15 - n(profile.uncertaintyTolerance) * 0.3;\n  const threatAvoidance =\n    threatActivation * (1 - relationshipSafety * 0.25) * uncertaintyAvoidanceFactor;`,
);

for (const marker of [
  'reactivityThreshold: read(\'temperament.reactivity.threshold\')',
  'uncertaintyTolerance: read(\'temperament.exploration.uncertaintyTolerance\')',
  'approachDriveBias: read(\'temperament.exploration.approachDrive\')',
  'const thresholdFactor = 0.75 + (1 - n(profile.reactivityThreshold)) * 0.5;',
]) {
  if (!source.includes(marker)) throw new Error(`missing temperament wiring marker: ${marker}`);
}
fs.writeFileSync(enginePath, source);

const testPath = 'src/services/kairaTemperamentPanelWiringContracts.test.ts';
const test = `import { describe, expect, it } from 'vitest';\nimport { computeTemperamentResponse, DEFAULT_TEMPERAMENT_PROFILE, temperamentFromFineTune } from './temperamentEngine';\n\nconst event = { negativeLoad: 0.7, frustrationLoad: 0.7, threatLoad: 0.7, rewardLoad: 0.2, noveltyLoad: 0.8, repetitionLoad: 0.3, relationshipSafety: 0.3, currentStress: 0.3 };\n\ndescribe('temperament CharacterTab runtime wiring', () => {\n  it('reads every exploration slider that the panel exposes', () => {\n    const profile = temperamentFromFineTune({\n      'temperament.exploration.noveltySeeking': 71,\n      'temperament.exploration.uncertaintyTolerance': 82,\n      'temperament.exploration.approachDrive': 93,\n      'temperament.reactivity.threshold': 64,\n    });\n    expect(profile.noveltySeeking).toBe(71);\n    expect(profile.uncertaintyTolerance).toBe(82);\n    expect(profile.approachDriveBias).toBe(93);\n    expect(profile.reactivityThreshold).toBe(64);\n  });\n\n  it('makes a higher reaction threshold reduce activation instead of increasing threat sensitivity', () => {\n    const low = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, reactivityThreshold: 10 }, event);\n    const high = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, reactivityThreshold: 90 }, event);\n    expect(high.negativeActivation).toBeLessThan(low.negativeActivation);\n    expect(high.frustrationActivation).toBeLessThan(low.frustrationActivation);\n    expect(high.threatActivation).toBeLessThan(low.threatActivation);\n  });\n\n  it('lets uncertainty tolerance and approach drive affect actual approach behavior', () => {\n    const lowTolerance = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, uncertaintyTolerance: 10 }, event);\n    const highTolerance = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, uncertaintyTolerance: 90 }, event);\n    expect(highTolerance.approachDrive).toBeGreaterThan(lowTolerance.approachDrive);\n\n    const lowDrive = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, approachDriveBias: 10 }, event);\n    const highDrive = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, approachDriveBias: 90 }, event);\n    expect(highDrive.approachDrive).toBeGreaterThan(lowDrive.approachDrive);\n  });\n});\n`;
fs.writeFileSync(testPath, test);
console.log('Wired temperament panel exploration controls and corrected reaction-threshold direction');
