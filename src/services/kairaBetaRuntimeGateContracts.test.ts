import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const ci = fs.readFileSync(path.resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

const betaScript = String(packageJson.scripts?.['test:beta'] ?? '');

const required = [
  'kairaDistributedChatIdempotency.test.ts',
  'kairaFirestoreChatIdempotency.test.ts',
  'kairaTimeoutRetryEndToEndRegression.test.ts',
  'droitChatServiceRetryIdempotencyRegression.test.ts',
  'kairaRuntimeTurnSnapshotsRegression.test.ts',
  'kairaLongSessionConsistencyRegression.test.ts',
  'kairaQualitativeSpeechDifferentiationRegression.test.ts',
  'kairaLanguageMemorySelfDrift.test.ts',
  'kairaLanguageMemoryStalePhraseSelection.test.ts',
  'kairaResponsePlanFinalAuthorityContracts.test.ts',
  'kairaKntTurnDebugUiContracts.test.ts',
  // Advanced beta behavior seams must remain in the fast pre-full-suite gate.
  'kairaEpistemicRuntimeContracts.test.ts',
  'kairaControlledSpontaneityIntegrationContracts.test.ts',
  'kairaAutonomousStateChatWiringContracts.test.ts',
  'kairaBetaConversationContinuityRegression.test.ts',
];

describe('beta runtime regression gate', () => {
  it('keeps critical runtime regressions in one explicit beta command', () => {
    expect(betaScript).toContain('vitest run');
    for (const file of required) expect(betaScript).toContain(file);
  });

  it('runs the beta gate in CI before the full test suite', () => {
    const betaIndex = ci.indexOf('Beta runtime regression gate');
    const fullIndex = ci.indexOf('- name: Tests');
    expect(betaIndex).toBeGreaterThan(-1);
    expect(ci).toContain('run: npm run test:beta');
    expect(fullIndex).toBeGreaterThan(betaIndex);
  });
});
