import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryCacheKey, stateOwnerScope } from './kairaInstanceContext';

const firestoreStore = new Map<string, Array<Record<string, unknown>>>();

vi.mock('../lib/firebase', () => ({ db: { kind: 'db' } }));
vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => {
    const parts = args.slice(1).map((part: any) =>
      typeof part === 'string' ? part : String(part?.path || ''),
    );
    return { kind: 'doc', path: parts.join('/') };
  },
  collection: (...args: any[]) => {
    const [parent, child] = args.length === 2 ? args : [args[0], args.slice(1).join('/')];
    const parentPath = parent?.kind === 'db' ? '' : String(parent?.path || '');
    return { kind: 'collection', path: [parentPath, child].filter(Boolean).join('/') };
  },
  query: (ref: any) => ref,
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async (ref: { path: string }) => {
    const rows = firestoreStore.get(ref.path) || [];
    return {
      empty: rows.length === 0,
      docs: rows.map((row, index) => ({
        id: `row-${index + 1}`,
        data: () => ({ ...row }),
      })),
    };
  }),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

import { loadRecentKdmMemory } from './kdmPersistenceService';

describe('fresh-user memory isolation regression', () => {
  beforeEach(() => {
    firestoreStore.clear();
    vi.clearAllMocks();
  });

  it('keeps formerly-colliding fresh users on different owner and cache scopes', () => {
    const colonUser = stateOwnerScope('fresh:user');
    const slashUser = stateOwnerScope('fresh/user');

    expect(colonUser).not.toBe(slashUser);
    expect(memoryCacheKey('fresh:user')).not.toBe(memoryCacheKey('fresh/user'));

    // The v2 prefix is reserved: a literal raw id matching an encoded key is
    // encoded again rather than being allowed to shadow another user's scope.
    expect(stateOwnerScope(colonUser)).not.toBe(colonUser);

    const longA = `fresh-${'a'.repeat(100)}-A`;
    const longB = `fresh-${'a'.repeat(100)}-B`;
    expect(stateOwnerScope(longA)).not.toBe(stateOwnerScope(longB));
  });

  it('lets user A retrieve its canary while a fresh formerly-colliding user B sees nothing', async () => {
    const userA = stateOwnerScope('fresh:user');
    const userB = stateOwnerScope('fresh/user');
    const canary = 'A_ONLY_MEMORY_CANARY_6f00d7';

    firestoreStore.set(`kdmState/${userA}/kdmTraces`, [
      {
        userMessage: canary,
        reply: 'yalnız A kullanıcısına ait cevap',
        createdAt: '2026-09-04T19:10:00.000Z',
        memoryScope: 'episodic',
      },
    ]);

    const aMemory = await loadRecentKdmMemory(6, userA);
    const bMemory = await loadRecentKdmMemory(6, userB);

    expect(aMemory.some((item) => item.userMessage === canary)).toBe(true);
    expect(bMemory).toEqual([]);
    expect(JSON.stringify(bMemory)).not.toContain(canary);
  });

  it('preserves legacy Firestore paths for already-safe existing user ids', () => {
    expect(stateOwnerScope('legacy-user')).toBe('legacy-user');
    expect(stateOwnerScope('legacy-user', 'kaira_individual_001')).toBe(
      'legacy-user__kaira_individual_001',
    );
  });
});
