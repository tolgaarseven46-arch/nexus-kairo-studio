import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ci = fs.readFileSync(path.resolve(root, '.github/workflows/ci.yml'), 'utf8');
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(root, 'config/beta-conversation-acceptance.json'), 'utf8'),
) as { version: number; tests: string[] };
const betaPackage = JSON.parse(
  fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'),
) as { scripts?: Record<string, string> };

describe('beta conversation acceptance gate', () => {
  it('uses one canonical manifest whose tests exist and are product-specific', () => {
    expect(manifest.version).toBe(1);
    expect(manifest.tests).toEqual([
      'src/services/kairaBetaConversationAcceptanceScenario.test.ts',
      'src/services/kairaTwentyTurnPersistenceRoundtripRegression.test.ts',
    ]);

    for (const file of manifest.tests) {
      expect(fs.existsSync(path.resolve(root, file))).toBe(true);
    }
  });

  it('does not duplicate acceptance ownership inside the beta regression package', () => {
    const betaCommand = betaPackage.scripts?.['test:beta'] ?? '';
    for (const file of manifest.tests) {
      expect(betaCommand).not.toContain(file);
    }
  });

  it('runs the canonical runner before the full suite', () => {
    const acceptanceIndex = ci.indexOf('- name: Beta conversation acceptance');
    const runnerIndex = ci.indexOf('node scripts/run-beta-conversation-acceptance.mjs');
    const fullIndex = ci.indexOf('- name: Tests');

    expect(acceptanceIndex).toBeGreaterThan(-1);
    expect(runnerIndex).toBeGreaterThan(acceptanceIndex);
    expect(fullIndex).toBeGreaterThan(runnerIndex);
  });
});
