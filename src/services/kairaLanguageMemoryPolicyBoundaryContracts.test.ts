import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  chooseLanguageReply,
  getLanguageMemory,
  languageMemorySummary,
  languageStyleMemoryInstruction,
  languageStyleMemorySignal,
  learnLanguageReply,
} from './kairoLanguageMemory';

describe('language-memory policy read boundary', () => {
  it('returns a cold style signal and no prompt instruction when learned-memory reads are disabled', () => {
    const userId = 'memory-read-policy-style-trained';
    const profile = getLanguageMemory(userId);
    profile.wordWeights = { ...profile.wordWeights };
    profile.phraseWeights = {};
    profile.recentReplies = [];
    profile.interactionCount = 0;

    for (let i = 0; i < 12; i += 1) learnLanguageReply(userId, `iyidir kanka valla ${i}`);

    expect(languageStyleMemorySignal(userId, true).maturity).toBe('learned');
    expect(languageStyleMemorySignal(userId, false)).toEqual({
      interactionCount: 0,
      maturity: 'cold',
      preferredMarkers: [],
      averageWords: 0,
      lengthPreference: 'very_short',
    });
    expect(languageStyleMemoryInstruction(userId, false)).toBe('');
  });

  it('makes disabled learned-memory selection equivalent to a fresh cold profile', () => {
    const trainedUserId = 'memory-read-policy-trained-selector';
    const coldUserId = 'memory-read-policy-cold-selector';
    const candidates = ['iyiyim sen', 'iyi valla sen nasılsın', 'iyidir kanka senden'];
    const seed = 'how_are_you|naber|5|85|0|neutral|casual|q1|h1';

    for (let i = 0; i < 20; i += 1) learnLanguageReply(trainedUserId, 'iyidir kanka senden');

    const gated = chooseLanguageReply(trainedUserId, candidates, seed, false);
    const cold = chooseLanguageReply(coldUserId, candidates, seed, true);
    expect(gated).toBe(cold);
  });

  it('hides stale learned state from summaries when learned-memory reads are disabled', () => {
    const userId = 'memory-read-policy-summary-trained';
    for (let i = 0; i < 8; i += 1) learnLanguageReply(userId, `iyidir kanka senden ${i}`);

    expect(languageMemorySummary(userId, true).interactionCount).toBeGreaterThan(0);
    const gated = languageMemorySummary(userId, false);
    expect(gated.interactionCount).toBe(0);
    expect(gated.persistent).toBe(false);
    expect(gated.recentReplies).toEqual([]);
  });

  it('wires persistentUserMemory into every learned language read on the server path', async () => {
    const server = await readFile('server.ts', 'utf8');
    expect(server).toContain('languageStyleMemorySignal(stateUserId, kairaPolicy.persistentUserMemory)');
    expect(server).toContain('languageStyleMemoryInstruction(stateUserId, kairaPolicy.persistentUserMemory)');
    expect(server).toContain('languageUnderstanding.event,\n        kairaPolicy.persistentUserMemory,\n      )');
  });

  it('keeps the local verbalizer gate explicit and defaults it on for direct callers', async () => {
    const local = await readFile('src/services/kairoLocalLanguageEngine.ts', 'utf8');
    expect(local).toContain('useLearnedMemory = true');
    expect(local).toContain('useLearnedMemory,\n  );');
  });

  it('gates language-memory debug hydration and summary reads by the resolved instance policy', async () => {
    const server = await readFile('server.ts', 'utf8');
    const routeStart = server.indexOf('app.get("/api/kaira/language-memory"');
    const routeEnd = server.indexOf('app.get("/api/test-sessions/active"', routeStart);
    const route = server.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThanOrEqual(0);
    expect(route).toContain('const policy = instancePolicy(instance.instanceType)');
    expect(route).toContain('if (policy.persistentUserMemory) await hydrateLanguageMemory(scopedUserId)');
    expect(route).toContain('languageMemorySummary(scopedUserId, policy.persistentUserMemory)');
  });
});
