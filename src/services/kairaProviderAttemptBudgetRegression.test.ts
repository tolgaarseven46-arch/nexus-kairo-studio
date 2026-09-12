import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('provider attempt cost-safety regression', () => {
  it('caps OpenRouter-local outbound attempt sites at two and requires a shared generation budget', () => {
    const server = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    const openRouterBlock = server.slice(
      server.indexOf('async function callOpenRouter'),
      server.indexOf('type AiProviderUsed'),
    );
    const generationBlock = server.slice(
      server.indexOf('async function generateTextResult'),
      server.indexOf('async function generateText(', server.indexOf('async function generateTextResult')),
    );

    expect((openRouterBlock.match(/await requestModel\(/g) || []).length).toBeLessThanOrEqual(2);
    expect(server).toContain('const KAIRA_PROVIDER_MAX_OUTBOUND_ATTEMPTS = 2');
    expect(server).toContain('createKairaProviderAttemptBudget');
    expect(openRouterBlock).toContain('consumeKairaProviderAttempt(attemptBudget, "openrouter")');
    expect(openRouterBlock).toContain('consumeKairaProviderAttempt(attemptBudget, "gemini")');
    expect(generationBlock).toContain('const attemptBudget = createKairaProviderAttemptBudget();');
    expect(generationBlock).toContain('attemptBudget.used < attemptBudget.max');
    expect((generationBlock.match(/attemptBudget/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
