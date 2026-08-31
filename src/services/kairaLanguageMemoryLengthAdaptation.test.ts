import { describe, expect, it } from 'vitest';
import {
  getLanguageMemory,
  languageStyleMemorySignal,
  learnLanguageReply,
} from './kairoLanguageMemory';

describe('language-memory response-length adaptation', () => {
  it('forgets stale long-form preference when the bounded recent window turns short', () => {
    const userId = 'length-adaptation-long-to-short';
    const profile = getLanguageMemory(userId);
    profile.wordWeights = { kanka: 8, ya: 7, valla: 5, aynen: 5, he: 3, iyidir: 4, takılıyorum: 4, senden: 4 };
    profile.phraseWeights = {};
    profile.recentReplies = [];
    profile.interactionCount = 0;

    for (let i = 0; i < 8; i += 1) {
      learnLanguageReply(userId, `bugün burada biraz daha uzun konuşuyorum çünkü konuyu sakin sakin anlatmak istiyorum ${i}`);
    }
    expect(languageStyleMemorySignal(userId).lengthPreference).toBe('medium');

    for (let i = 0; i < 8; i += 1) learnLanguageReply(userId, `tamam ${i}`);

    const adapted = languageStyleMemorySignal(userId);
    expect(adapted.lengthPreference).toBe('very_short');
    expect(adapted.averageWords).toBeLessThanOrEqual(4);
  });

  it('adapts in the opposite direction when recent accepted replies become consistently longer', () => {
    const userId = 'length-adaptation-short-to-long';

    for (let i = 0; i < 8; i += 1) learnLanguageReply(userId, `he ${i}`);
    expect(languageStyleMemorySignal(userId).lengthPreference).toBe('very_short');

    for (let i = 0; i < 8; i += 1) {
      learnLanguageReply(userId, `bu sefer düşüncemi biraz daha ayrıntılı anlatıyorum çünkü bağlamın tamamı önemli geliyor bana ${i}`);
    }

    const adapted = languageStyleMemorySignal(userId);
    expect(adapted.lengthPreference).toBe('medium');
    expect(adapted.averageWords).toBeGreaterThan(8);
  });
});
