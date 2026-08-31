import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const server = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

describe('provider fallback learning boundary', () => {
  it('does not learn a deterministic provider fallback', () => {
    expect(server).toContain('providerFailureFallbackUsed = true;');
    expect(server).toContain('consistency.accepted && !providerFailureFallbackUsed');
  });

  it('re-enables learning only when a real repair generation becomes the final reply', () => {
    const betterRepair = server.indexOf('if (repairedIssues.length < groundingIssues.length) {');
    const providerAssignment = server.indexOf('activeAiProviderUsed = repairedGeneration.providerUsed;', betterRepair);
    const resetFallbackFlag = server.indexOf('providerFailureFallbackUsed = false;', providerAssignment);

    expect(betterRepair).toBeGreaterThan(0);
    expect(providerAssignment).toBeGreaterThan(betterRepair);
    expect(resetFallbackFlag).toBeGreaterThan(providerAssignment);
  });
});
