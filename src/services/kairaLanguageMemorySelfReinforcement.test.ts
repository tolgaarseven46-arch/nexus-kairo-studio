import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLanguageMemory,
  languageAffinity,
  languageStyleMemorySignal,
  learnLanguageReply,
} from './kairoLanguageMemory';

const userId = 'language-self-reinforcement-user';

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

describe('language-memory self-reinforcement bounds', () => {
  it('learns repeated style markers without allowing their word weights to grow without bound', () => {
    for (let i = 0; i < 100; i += 1) {
      learnLanguageReply(userId, `kanka ya bugün tur ${i}`);
    }

    const profile = getLanguageMemory(userId);
    expect(profile.wordWeights.kanka).toBeLessThanOrEqual(10.1);
    expect(profile.wordWeights.ya).toBeLessThanOrEqual(9.1);
    expect(profile.wordWeights.bugün).toBeLessThanOrEqual(2.1);
    expect(languageStyleMemorySignal(userId).preferredMarkers).toContain('kanka');
    expect(languageStyleMemorySignal(userId).preferredMarkers).toContain('ya');
  });

  it('keeps learned word affinity a bounded nudge instead of an unbounded local-selection authority', () => {
    const before = languageAffinity(userId, 'cidden tamam');
    for (let i = 0; i < 100; i += 1) learnLanguageReply(userId, `cidden tamam ${i}`);
    const after = languageAffinity(userId, 'cidden tamam');

    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeLessThanOrEqual(2.1);
  });
});
