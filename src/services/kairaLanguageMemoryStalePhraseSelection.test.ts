import { describe, expect, it } from 'vitest';
import {
  chooseLanguageReply,
  getLanguageMemory,
  learnLanguageReply,
} from './kairoLanguageMemory';

describe('language-memory stale exact-phrase selection pressure', () => {
  it('does not let a historically over-trained exact phrase monopolize later selection after sustained style change', () => {
    const userId = 'stale-phrase-selection';
    const stale = 'tamamdır harbi böyle';
    const currentA = 'anladım peki';
    const currentB = 'olur tamamdır';

    for (let i = 0; i < 12; i += 1) learnLanguageReply(userId, stale);
    for (let i = 0; i < 32; i += 1) learnLanguageReply(userId, `başka biçim ${i}`);

    const profile = getLanguageMemory(userId);
    expect(profile.phraseWeights[stale]).toBeGreaterThan(0);

    const counts = new Map<string, number>();
    for (let i = 0; i < 100; i += 1) {
      const reply = chooseLanguageReply(userId, [stale, currentA, currentB], `shifted-style-${i}`);
      counts.set(reply, (counts.get(reply) ?? 0) + 1);
    }

    expect(counts.get(stale) ?? 0).toBeLessThanOrEqual(50);
    expect((counts.get(currentA) ?? 0) + (counts.get(currentB) ?? 0)).toBeGreaterThanOrEqual(50);
  });
});
