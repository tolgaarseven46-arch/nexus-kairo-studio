import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.useFakeTimers();
  });

  it('restores learned phrase affinity after a module reload', async () => {
    const first = await freshLanguageMemoryModule();
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
});
