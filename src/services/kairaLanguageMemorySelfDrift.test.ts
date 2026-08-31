import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseLanguageReply,
  getLanguageMemory,
  languageStyleMemorySignal,
  learnLanguageReply,
} from './kairoLanguageMemory';

const userId = 'language-self-drift-user';
const BASE_WORDS: Record<string, number> = {
  kanka: 8,
  ya: 7,
  valla: 5,
  aynen: 5,
  he: 3,
  iyidir: 4,
  takılıyorum: 4,
  senden: 4,
};

beforeEach(() => {
  vi.useFakeTimers();
  const profile = getLanguageMemory(userId);
  profile.wordWeights = { ...BASE_WORDS };
  profile.phraseWeights = {};
  profile.recentReplies = [];
  profile.interactionCount = 0;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('language-memory self-drift bounds', () => {
  it('does not let repeated self-learning grow a style marker without bound', () => {
    for (let i = 0; i < 100; i += 1) {
      learnLanguageReply(userId, `bugün de buradayım kanka ${i % 7}`);
    }

    const profile = getLanguageMemory(userId);
    expect(profile.wordWeights.kanka).toBeLessThanOrEqual(BASE_WORDS.kanka + 2.1);
    expect(languageStyleMemorySignal(userId).preferredMarkers).toContain('kanka');
  });

  it('keeps a repeatedly self-trained social pool diverse over a long deterministic run', () => {
    const candidates = [
      'iyidir senden',
      'iyi ya senden',
      'valla iyidir',
      'he iyidir',
      'iyidir kanka senden',
      'takılıyorum ya',
    ];
    const counts = new Map<string, number>();
    let previous = '';
    let consecutiveDuplicates = 0;

    for (let i = 0; i < 200; i += 1) {
      const reply = chooseLanguageReply(userId, candidates, `self-drift-${i}`);
      counts.set(reply, (counts.get(reply) ?? 0) + 1);
      if (reply === previous) consecutiveDuplicates += 1;
      previous = reply;
      learnLanguageReply(userId, reply);
    }

    const ranked = [...counts.values()].sort((a, b) => b - a);
    const maxShare = (ranked[0] ?? 0) / 200;

    expect(counts.size).toBeGreaterThanOrEqual(4);
    expect(consecutiveDuplicates).toBe(0);
    expect(maxShare).toBeLessThanOrEqual(0.45);
  });

  it('does not turn one reply with repeated marker tokens into extra evidence', () => {
    learnLanguageReply(userId, 'kanka kanka kanka bugün buradayım');
    const afterOne = getLanguageMemory(userId).wordWeights.kanka;
    learnLanguageReply(userId, 'kanka yarın da buradayım');
    const afterTwo = getLanguageMemory(userId).wordWeights.kanka;

    expect(afterOne).toBeCloseTo(BASE_WORDS.kanka + 0.35, 5);
    expect(afterTwo).toBeCloseTo(BASE_WORDS.kanka + 0.7, 5);
  });
});
