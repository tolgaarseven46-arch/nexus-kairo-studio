import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseLanguageReply,
  getLanguageMemory,
  languageAffinity,
  learnLanguageReply,
} from './kairoLanguageMemory';

const userId = 'language_learning_contract_user';

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

describe('language-memory learning contracts', () => {
  it('raises style affinity for a repeatedly accepted writing pattern', () => {
    const reply = 'he tamamdır kanka';
    const before = languageAffinity(userId, reply);

    for (let i = 0; i < 8; i += 1) learnLanguageReply(userId, reply);

    const after = languageAffinity(userId, reply);
    expect(after).toBeGreaterThan(before);
    expect(getLanguageMemory(userId).interactionCount).toBe(8);
    expect(getLanguageMemory(userId).phraseWeights[reply]).toBe(8);
  });

  it('can change candidate preference after learning when recency pressure is absent', () => {
    const learned = 'he tamamdır kanka';
    const alternative = 'peki teşekkür ederim';

    for (let i = 0; i < 10; i += 1) learnLanguageReply(userId, learned);
    getLanguageMemory(userId).recentReplies = [];

    expect(chooseLanguageReply(userId, [alternative, learned], 'stable-seed')).toBe(learned);
  });

  it('does not let learned affinity force an immediate exact-repeat loop', () => {
    const learned = 'he tamamdır kanka';
    const alternative = 'tamam ya';

    for (let i = 0; i < 10; i += 1) learnLanguageReply(userId, learned);

    expect(chooseLanguageReply(userId, [alternative, learned], 'stable-seed')).toBe(alternative);
  });

  it('keeps recent-reply memory bounded while learning', () => {
    for (let i = 0; i < 12; i += 1) learnLanguageReply(userId, `cevap ${i}`);
    expect(getLanguageMemory(userId).recentReplies).toHaveLength(8);
    expect(getLanguageMemory(userId).recentReplies[0]).toBe('cevap 11');
  });
});
