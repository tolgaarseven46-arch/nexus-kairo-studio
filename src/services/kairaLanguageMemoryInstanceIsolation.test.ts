import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stateOwnerScope } from './kairaInstanceContext';

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

describe('language-memory instance isolation', () => {
  beforeEach(() => {
    firestoreStore.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('partitions persistent style memory by user plus Kaira instance', async () => {
    const userId = 'same-user';
    const instanceA = stateOwnerScope(userId, 'kaira_individual_a');
    const instanceB = stateOwnerScope(userId, 'kaira_individual_b');
    expect(instanceA).not.toBe(instanceB);

    const first = await freshLanguageMemoryModule();
    for (let i = 0; i < 4; i += 1) first.learnLanguageReply(instanceA, 'iyidir kanka senden');
    await vi.advanceTimersByTimeAsync(600);

    expect(firestoreStore.has(`kairoLanguageMemory/${instanceA}`)).toBe(true);
    expect(firestoreStore.has(`kairoLanguageMemory/${instanceB}`)).toBe(false);

    const reloaded = await freshLanguageMemoryModule();
    await reloaded.hydrateLanguageMemory(instanceB);
    expect(reloaded.languageMemorySummary(instanceB).interactionCount).toBe(0);

    await reloaded.hydrateLanguageMemory(instanceA);
    expect(reloaded.languageMemorySummary(instanceA).interactionCount).toBe(4);
    expect(reloaded.languageStyleMemorySignal(instanceA).maturity).toBe('emerging');
    expect(reloaded.languageStyleMemorySignal(instanceB).maturity).toBe('cold');
  });

  it('keeps separate users isolated inside the same Kaira instance', async () => {
    const instanceId = 'kaira_individual_shared';
    const userA = stateOwnerScope('user-a', instanceId);
    const userB = stateOwnerScope('user-b', instanceId);
    expect(userA).not.toBe(userB);

    const memory = await freshLanguageMemoryModule();
    for (let i = 0; i < 3; i += 1) memory.learnLanguageReply(userA, 'valla kanka aynen');

    expect(memory.languageMemorySummary(userA).interactionCount).toBe(3);
    expect(memory.languageMemorySummary(userB).interactionCount).toBe(0);
    expect(memory.languageStyleMemorySignal(userA).maturity).toBe('emerging');
    expect(memory.languageStyleMemorySignal(userB).maturity).toBe('cold');
  });

  it('preserves the legacy reference-Kaira owner key while scoping non-reference instances', () => {
    expect(stateOwnerScope('legacy-user', 'kaira_reference_001')).toBe('legacy-user');
    expect(stateOwnerScope('legacy-user', 'kaira_individual_001')).toBe('legacy-user__kaira_individual_001');
  });
});
