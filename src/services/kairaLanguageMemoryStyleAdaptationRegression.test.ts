import { describe, expect, it } from 'vitest';
import {
  getLanguageMemory,
  languageAffinity,
  languageStyleMemorySignal,
  learnLanguageReply,
} from './kairoLanguageMemory';

describe('language-memory style adaptation', () => {
  it('lets an old learned marker fade when later accepted replies consistently stop using it', () => {
    const userId = 'style-adaptation-marker';

    for (let i = 0; i < 12; i += 1) learnLanguageReply(userId, `iyidir kanka valla ${i}`);
    const learned = languageStyleMemorySignal(userId);
    expect(learned.preferredMarkers).toContain('kanka');

    for (let i = 0; i < 24; i += 1) learnLanguageReply(userId, `tamam anladım ${i}`);
    const adapted = languageStyleMemorySignal(userId);

    expect(adapted.preferredMarkers).not.toContain('kanka');
    expect(adapted.preferredMarkers).not.toContain('valla');
  });

  it('preserves base Kaira identity weights while only learned excess decays', () => {
    const userId = 'style-adaptation-base';
    const profile = getLanguageMemory(userId);
    const initialKanka = profile.wordWeights.kanka;
    const initialYa = profile.wordWeights.ya;

    for (let i = 0; i < 10; i += 1) learnLanguageReply(userId, `kanka ya ${i}`);
    expect(profile.wordWeights.kanka).toBeGreaterThan(initialKanka);
    expect(profile.wordWeights.ya).toBeGreaterThan(initialYa);

    for (let i = 0; i < 40; i += 1) learnLanguageReply(userId, `tamamdır ${i}`);

    expect(profile.wordWeights.kanka).toBeGreaterThanOrEqual(initialKanka);
    expect(profile.wordWeights.ya).toBeGreaterThanOrEqual(initialYa);
  });

  it('reduces stale exact-phrase affinity after a sustained style change', () => {
    const userId = 'style-adaptation-phrase';
    const oldReply = 'he tamam kanka';

    for (let i = 0; i < 8; i += 1) learnLanguageReply(userId, oldReply);
    const before = languageAffinity(userId, oldReply);

    for (let i = 0; i < 30; i += 1) learnLanguageReply(userId, `anladım tamam ${i}`);
    const after = languageAffinity(userId, oldReply);

    expect(after).toBeLessThan(before);
  });
});
