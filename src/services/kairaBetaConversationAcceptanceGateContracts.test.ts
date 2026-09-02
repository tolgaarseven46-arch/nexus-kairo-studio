import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ci = fs.readFileSync(path.resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

const required = [
  'kairaLongSessionConsistencyRegression.test.ts',
  'kairaQualitativeSpeechDifferentiationRegression.test.ts',
  'kairaControlledSpontaneityIntegrationContracts.test.ts',
  'kairaBetaConversationContinuityRegression.test.ts',
  'kairaTwentyTurnPersistenceRoundtripRegression.test.ts',
  'kairaLanguageMemorySelfDrift.test.ts',
  'kairaResponsePlanFinalAuthorityContracts.test.ts',
];

describe('beta conversation acceptance gate', () => {
  it('keeps the product-facing conversation acceptance matrix explicit in CI', () => {
    const stepIndex = ci.indexOf('- name: Beta conversation acceptance');
    expect(stepIndex).toBeGreaterThan(-1);
    for (const file of required) expect(ci).toContain(file);
  });

  it('runs acceptance before the full suite', () => {
    const acceptanceIndex = ci.indexOf('- name: Beta conversation acceptance');
    const fullIndex = ci.indexOf('- name: Tests');
    expect(acceptanceIndex).toBeGreaterThan(-1);
    expect(fullIndex).toBeGreaterThan(acceptanceIndex);
  });
});
