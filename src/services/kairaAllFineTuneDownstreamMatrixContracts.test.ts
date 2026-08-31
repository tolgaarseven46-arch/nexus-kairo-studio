import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { temperamentFromFineTune } from './temperamentEngine';

const CHARACTER_TAB = 'src/components/studio/tabs/CharacterTab.tsx';

const familyContracts: Record<string, string[]> = {
  temperament: [
    'src/services/kairaTemperamentPanelWiringContracts.test.ts',
    'src/services/kairaTemperamentLiveCoverageContracts.test.ts',
    'src/services/kairaTemperamentRecoveryPersistenceWiringContracts.test.ts',
  ],
  personality: ['src/services/kairaPersonalityDownstreamCoverageContracts.test.ts'],
  motivation: ['src/services/kairaMotivationDownstreamCoverageContracts.test.ts'],
  values: ['src/services/kairaValueDownstreamCoverageContracts.test.ts'],
  preferences: ['src/services/kairaPreferenceDownstreamCoverageContracts.test.ts'],
  social: ['src/services/kairaSocialDownstreamCoverageContracts.test.ts'],
  boundaries: ['src/services/kairaBoundaryDownstreamCoverageContracts.test.ts'],
  expression: ['src/services/kairaExpressionDownstreamCoverageContracts.test.ts'],
};

const expectedCounts: Record<string, number> = {
  temperament: 9,
  personality: 6,
  motivation: 8,
  values: 8,
  preferences: 6,
  social: 8,
  boundaries: 6,
  expression: 13,
};

function readCharacterTabKeys() {
  const source = fs.readFileSync(CHARACTER_TAB, 'utf8');
  return [...source.matchAll(/key:\s*'([^']+)'/g)].map((match) => match[1]);
}

describe('all fine-tune downstream matrix', () => {
  it('locks the CharacterTab matrix to eight behavior families and 64 sliders', () => {
    const keys = readCharacterTabKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(64);
    expect(Object.keys(expectedCounts)).toEqual(Object.keys(familyContracts));

    for (const [family, expectedCount] of Object.entries(expectedCounts)) {
      expect(keys.filter((key) => key.startsWith(family + '.'))).toHaveLength(expectedCount);
    }
  });

  it('keeps every family backed by permanent downstream coverage contracts', () => {
    for (const [family, files] of Object.entries(familyContracts)) {
      expect(files.length, family).toBeGreaterThan(0);
      for (const file of files) {
        expect(fs.existsSync(file), family + ': ' + file).toBe(true);
        expect(fs.readFileSync(file, 'utf8').length, file).toBeGreaterThan(200);
      }
    }
  });

  it('keeps every visible UI fine-tune key connected to its family implementation/coverage seam', () => {
    const keys = readCharacterTabKeys();
    const familySources: Record<string, string[]> = {
      temperament: ['src/services/temperamentEngine.ts', ...familyContracts.temperament],
      personality: ['src/services/personalityTendencyEngine.ts', ...familyContracts.personality],
      motivation: ['src/services/motivationEngine.ts', ...familyContracts.motivation],
      values: ['src/services/valueEngine.ts', ...familyContracts.values],
      preferences: ['src/services/preferenceEngine.ts', ...familyContracts.preferences],
      social: ['src/services/socialOrientationEngine.ts', ...familyContracts.social],
      boundaries: ['src/services/boundaryEngine.ts', ...familyContracts.boundaries],
      expression: ['src/services/expressionStyleEngine.ts', ...familyContracts.expression],
    };

    for (const key of keys) {
      const family = key.split('.')[0];
      const corpus = familySources[family].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
      expect(corpus.includes(key), key).toBe(true);
    }
  });

  it('locks all nine visible temperament aliases to the thirteen-dimension canonical model', () => {
    const profile = temperamentFromFineTune({
      'temperament.reactivity.sensitivity': 61,
      'temperament.reactivity.intensity': 62,
      'temperament.reactivity.threshold': 63,
      'temperament.regulation.inhibitoryControl': 64,
      'temperament.regulation.recoveryRate': 65,
      'temperament.regulation.persistence': 66,
      'temperament.exploration.noveltySeeking': 67,
      'temperament.exploration.uncertaintyTolerance': 68,
      'temperament.exploration.approachDrive': 69,
    });

    expect(profile.negativeSensitivity).toBe(61);
    expect(profile.frustrationSensitivity).toBe(62);
    expect(profile.reactivityThreshold).toBe(63);
    expect(profile.inhibitoryControl).toBe(64);
    expect(profile.recoverySpeed).toBe(65);
    expect(profile.attentionPersistence).toBe(66);
    expect(profile.noveltySeeking).toBe(67);
    expect(profile.uncertaintyTolerance).toBe(68);
    expect(profile.approachDriveBias).toBe(69);
  });
});
