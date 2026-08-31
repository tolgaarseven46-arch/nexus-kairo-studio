import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('final accepted language-memory integration', () => {
  it('learns AI output only after final AI consistency acceptance', async () => {
    const server = await readFile('server.ts', 'utf8');
    const consistencyIndex = server.indexOf('const consistency = {', server.indexOf('const aiMs ='));
    const learningIndex = server.indexOf('learnLanguageReply(stateUserId, reply)', consistencyIndex);

    expect(server).toContain('learnLanguageReply,');
    expect(consistencyIndex).toBeGreaterThanOrEqual(0);
    expect(learningIndex).toBeGreaterThan(consistencyIndex);
    expect(server.slice(consistencyIndex, learningIndex)).toContain('consistency.accepted');
  });

  it('learns local output only after local final consistency acceptance', async () => {
    const server = await readFile('server.ts', 'utf8');
    const localConsistencyIndex = server.indexOf('localBaseConsistency = validateKairoResponse');
    const localLearningIndex = server.indexOf('learnLanguageReply(stateUserId, reply)', localConsistencyIndex);
    const localPersistenceIndex = server.indexOf('const postStart = now()', localConsistencyIndex);

    expect(localConsistencyIndex).toBeGreaterThanOrEqual(0);
    expect(localLearningIndex).toBeGreaterThan(localConsistencyIndex);
    expect(localPersistenceIndex).toBeGreaterThan(localLearningIndex);
    expect(server.slice(localConsistencyIndex, localLearningIndex)).toContain('consistency = {');
    expect(server.slice(localLearningIndex - 120, localLearningIndex)).toContain('kairaPolicy.persistentUserMemory && consistency.accepted');
    expect(server.slice(localLearningIndex, localPersistenceIndex + 24)).toContain('const postStart = now();');
  });

  it('keeps the local verbalizer free of pre-delivery learning side effects', async () => {
    const local = await readFile('src/services/kairoLocalLanguageEngine.ts', 'utf8');
    expect(local).not.toContain('learnLanguageReply');
    expect(local).toContain('chooseLanguageReply');
  });

  it('has exactly one final accepted learning call per server response path', async () => {
    const server = await readFile('server.ts', 'utf8');
    const calls = server.match(/learnLanguageReply\(stateUserId, reply\)/g) ?? [];
    expect(calls).toHaveLength(2);
  });
});
