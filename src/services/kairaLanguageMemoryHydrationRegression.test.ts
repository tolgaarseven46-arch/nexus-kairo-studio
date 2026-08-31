import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreStore = new Map<string, any>();

vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ key: `${collection}/${id}` }),
  getDoc: vi.fn(async (ref: { key: string }) => {
    const value = firestoreStore.get(ref.key);
    return {
      exists: () => value !== undefined,
      data: () => value,
    };
  }),
  setDoc: vi.fn(async (ref: { key: string }, value: any) => {
    firestoreStore.set(ref.key, { ...value });
  }),
  serverTimestamp: () => 'server-timestamp',
}));

async function freshLanguageMemoryModule() {
  vi.resetModules();
  return import('./kairoLanguageMemory');
}

describe('language-memory hydration regression', () => {
  beforeEach(() => {
    firestoreStore.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('restores learned phrase affinity after a module reload', async () => {
    const first = await freshLanguageMemoryModule();
    const firestore = await import('firebase/firestore');
    const userId = 'hydration-regression-user';
    const learnedReply = 'he tamam kanka!';
    const neutralReply = 'anladım tamam';

    first.learnLanguageReply(userId, learnedReply);
    first.learnLanguageReply(userId, learnedReply);
    first.learnLanguageReply(userId, learnedReply);

    const beforeReload = first.languageAffinity(userId, learnedReply);
    expect(beforeReload).toBeGreaterThan(first.languageAffinity(userId, neutralReply));

    await vi.advanceTimersByTimeAsync(600);
    expect(firestoreStore.size).toBe(1);
    expect(vi.mocked(firestore.setDoc).mock.calls.at(-1)).toHaveLength(2);

    const reloaded = await freshLanguageMemoryModule();
    const coldSummary = reloaded.languageMemorySummary(userId);
    expect(coldSummary.interactionCount).toBe(0);
    expect(coldSummary.persistent).toBe(false);

    await reloaded.hydrateLanguageMemory(userId);

    const hydratedSummary = reloaded.languageMemorySummary(userId);
    expect(hydratedSummary.persistent).toBe(true);
    expect(hydratedSummary.interactionCount).toBe(3);
    expect(reloaded.languageAffinity(userId, learnedReply)).toBeCloseTo(beforeReload, 6);
    expect(reloaded.languageAffinity(userId, learnedReply)).toBeGreaterThan(
      reloaded.languageAffinity(userId, neutralReply),
    );
  });

  it('uses the same canonical phrase key across punctuation variants after hydration', async () => {
    const first = await freshLanguageMemoryModule();
    const userId = 'hydration-canonical-user';

    first.learnLanguageReply(userId, 'he tamam kanka!');
    await vi.advanceTimersByTimeAsync(600);

    const reloaded = await freshLanguageMemoryModule();
    await reloaded.hydrateLanguageMemory(userId);

    const punctuated = reloaded.languageAffinity(userId, 'he tamam kanka!');
    const plain = reloaded.languageAffinity(userId, 'he tamam kanka');
    expect(plain).toBeCloseTo(punctuated, 6);
  });

  it('sanitizes and bounds an oversized legacy Firestore profile during hydration', async () => {
    const userId = 'hydration-bounds-user';
    const wordWeights: Record<string, unknown> = {};
    const phraseWeights: Record<string, unknown> = {};
    for (let i = 0; i < 300; i += 1) wordWeights[`kelime${i}`] = i % 31;
    for (let i = 0; i < 180; i += 1) phraseWeights[`ifade ${i}`] = i % 21;
    wordWeights.bozuk = Number.NaN;
    phraseWeights.negatif = -5;

    firestoreStore.set(`kairoLanguageMemory/${userId}`, {
      wordWeights,
      phraseWeights,
      recentReplies: Array.from({ length: 20 }, (_, i) => `cevap ${i}`),
      interactionCount: 42,
    });

    const reloaded = await freshLanguageMemoryModule();
    await reloaded.hydrateLanguageMemory(userId);
    const profile = reloaded.getLanguageMemory(userId);

    expect(Object.keys(profile.wordWeights).length).toBeLessThanOrEqual(128);
    expect(Object.keys(profile.phraseWeights).length).toBeLessThanOrEqual(64);
    expect(profile.recentReplies).toHaveLength(8);
    expect(profile.interactionCount).toBe(42);
    expect(profile.wordWeights.kanka).toBeDefined();
    expect(profile.wordWeights.bozuk).toBeUndefined();
    expect(profile.phraseWeights.negatif).toBeUndefined();
    expect(Object.values(profile.wordWeights).every(Number.isFinite)).toBe(true);
    expect(Object.values(profile.phraseWeights).every(Number.isFinite)).toBe(true);
  });
});
