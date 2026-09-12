import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('provider attempt cost-safety contract', () => {
  it('caps OpenRouter-local outbound attempt sites at two and requires a shared generation budget', () => {
    const server = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    const openRouterBlock = server.slice(
      server.indexOf('async function callOpenRouter'),
      server.indexOf('type AiProviderUsed'),
    );

    expect((openRouterBlock.match(/await requestModel\(/g) || []).length).toBeLessThanOrEqual(2);
    expect(server).toContain('KAIRA_PROVIDER_MAX_OUTBOUND_ATTEMPTS');
    expect(server).toContain('createKairaProviderAttemptBudget');
  });
});
