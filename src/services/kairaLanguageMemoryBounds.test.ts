import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLanguageMemory, learnLanguageReply } from './kairoLanguageMemory';

const userId = 'language-memory-bounds-user';
const baseWords = ['kanka', 'ya', 'valla', 'aynen', 'he', 'iyidir', 'takılıyorum', 'senden'];

beforeEach(() => {
  vi.useFakeTimers();
  const profile = getLanguageMemory(userId);
  profile.wordWeights = { kanka: 8, ya: 7, valla: 5, aynen: 5, he: 3, iyidir: 4, takılıyorum: 4, senden: 4 };
  profile.phraseWeights = {};
  profile.recentReplies = [];
  profile.interactionCount = 0;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('language-memory persistence bounds', () => {
  it('keeps learned word and phrase maps bounded under long unique-reply churn', () => {
    for (let i = 0; i < 300; i += 1) {
      learnLanguageReply(userId, `benzersizkelime${i} farklıifade${i} bugün${i}`);
    }

    const profile = getLanguageMemory(userId);
    expect(Object.keys(profile.wordWeights).length).toBeLessThanOrEqual(128);
    expect(Object.keys(profile.phraseWeights).length).toBeLessThanOrEqual(64);
    expect(profile.interactionCount).toBe(300);
    expect(profile.recentReplies).toHaveLength(8);
    for (const word of baseWords) expect(profile.wordWeights[word]).toBeDefined();
  });

  it('keeps a repeatedly learned phrase through later unique phrase churn', () => {
    const stable = 'he tamamdır kanka';
    for (let i = 0; i < 10; i += 1) learnLanguageReply(userId, stable);
    for (let i = 0; i < 160; i += 1) learnLanguageReply(userId, `tekseferlik ifade ${i}`);

    const profile = getLanguageMemory(userId);
    expect(profile.phraseWeights[stable]).toBe(10);
    expect(Object.keys(profile.phraseWeights).length).toBeLessThanOrEqual(64);
  });
});
