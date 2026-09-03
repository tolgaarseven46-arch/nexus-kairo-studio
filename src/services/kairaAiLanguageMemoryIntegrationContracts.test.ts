import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('final accepted language-memory integration', () => {
  it('learns AI output only after the final unified/legacy consistency decision', async () => {
    const server = await readFile('server.ts', 'utf8');
    const aiRegionStart = server.indexOf('const finalPlanIssues = postEnforcementPlanIssues');
    const consistencyIndex = server.indexOf('const consistency = canonicalConstraint', aiRegionStart);
    const learningIndex = server.indexOf('learnLanguageReply(stateUserId, reply)', consistencyIndex);

    expect(server).toContain('learnLanguageReply,');
    expect(aiRegionStart).toBeGreaterThanOrEqual(0);
    expect(consistencyIndex).toBeGreaterThan(aiRegionStart);
    expect(learningIndex).toBeGreaterThan(consistencyIndex);
    expect(server.slice(consistencyIndex, learningIndex)).toContain('accepted:');
    expect(server.slice(learningIndex - 160, learningIndex)).toContain('consistency.accepted');
    expect(server.slice(learningIndex - 160, learningIndex)).toContain('!providerFailureFallbackUsed');
  });

  it('learns local output only after the local unified/legacy consistency decision and delivery checks', async () => {
    const server = await readFile('server.ts', 'utf8');
    const localBaseConsistencyIndex = server.indexOf('localBaseConsistency = canonicalConstraint?.consistency ?? validateKairoResponse');
    const localConsistencyIndex = server.indexOf('consistency = canonicalConstraint', localBaseConsistencyIndex);
    const localDeliveryIndex = server.indexOf('const localDeliveryIssues = [', localConsistencyIndex);
    const localLearningIndex = server.indexOf('learnLanguageReply(stateUserId, reply)', localDeliveryIndex);
    const localPersistenceIndex = server.indexOf('const postStart = now()', localLearningIndex);

    expect(localBaseConsistencyIndex).toBeGreaterThanOrEqual(0);
    expect(localConsistencyIndex).toBeGreaterThan(localBaseConsistencyIndex);
    expect(localDeliveryIndex).toBeGreaterThan(localConsistencyIndex);
    expect(localLearningIndex).toBeGreaterThan(localDeliveryIndex);
    expect(localPersistenceIndex).toBeGreaterThan(localLearningIndex);
    expect(server.slice(localDeliveryIndex, localLearningIndex)).toContain('localDeliveryIssues.length === 0');
    expect(server.slice(localLearningIndex - 160, localLearningIndex)).toContain('kairaPolicy.persistentUserMemory && consistency.accepted');
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
