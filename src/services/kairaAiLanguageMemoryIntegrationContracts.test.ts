import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('accepted AI language-memory integration', () => {
  it('learns only after final AI consistency acceptance', async () => {
    const server = await readFile('server.ts', 'utf8');
    const consistencyIndex = server.indexOf('const consistency = {', server.indexOf('const aiMs ='));
    const learningIndex = server.indexOf('learnLanguageReply(stateUserId, reply)', consistencyIndex);

    expect(server).toContain('learnLanguageReply,');
    expect(consistencyIndex).toBeGreaterThanOrEqual(0);
    expect(learningIndex).toBeGreaterThan(consistencyIndex);
    expect(server).toContain('if (kairaPolicy.persistentUserMemory && consistency.accepted)');
  });

  it('does not add a second server-side learning call to the local-language early-return path', async () => {
    const server = await readFile('server.ts', 'utf8');
    const calls = server.match(/learnLanguageReply\(stateUserId, reply\)/g) ?? [];
    expect(calls).toHaveLength(1);
  });
});
