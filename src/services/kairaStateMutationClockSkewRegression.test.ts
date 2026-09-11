import { beforeEach, describe, expect, it, vi } from 'vitest';

const lockStore = new Map<string, Record<string, unknown>>();

vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, _collection: string, key: string) => ({ key }),
  runTransaction: async (_db: unknown, callback: (tx: any) => Promise<unknown>) => callback({
    get: async (ref: { key: string }) => {
      const value = lockStore.get(ref.key);
      return {
        exists: () => value !== undefined,
        data: () => value,
      };
    },
    set: (ref: { key: string }, value: Record<string, unknown>) => {
      lockStore.set(ref.key, { ...value });
    },
    delete: (ref: { key: string }) => {
      lockStore.delete(ref.key);
    },
  }),
}));

import {
  firestoreStateMutationBackend,
  STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS,
} from './kairaFirestoreStateMutation';

describe('Kaira state mutation lease clock-skew regression', () => {
  beforeEach(() => lockStore.clear());

  it('does not let a fast-clock contender steal a freshly acquired active lease', async () => {
    const key = 'instance_clock_skew:user_clock_skew';
    const leaseMs = 10_000;
    const holderNow = 1_000_000;

    expect(await firestoreStateMutationBackend.acquire({
      key,
      ownerToken: 'holder-a',
      now: holderNow,
      leaseMs,
    })).toBe(true);

    // Instance B observes the same real instant with a wall clock 20 seconds ahead.
    // Bounded clock disagreement must not become concurrent ownership.
    expect(await firestoreStateMutationBackend.acquire({
      key,
      ownerToken: 'holder-b',
      now: holderNow + 20_000,
      leaseMs,
    })).toBe(false);
  });

  it('still allows crash recovery once lease expiry plus the skew bound has elapsed', async () => {
    const key = 'instance_clock_skew:user_recovery';
    const leaseMs = 10_000;
    const holderNow = 2_000_000;

    expect(await firestoreStateMutationBackend.acquire({
      key,
      ownerToken: 'holder-a',
      now: holderNow,
      leaseMs,
    })).toBe(true);

    expect(await firestoreStateMutationBackend.acquire({
      key,
      ownerToken: 'holder-b',
      now: holderNow + leaseMs + STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS + 1,
      leaseMs,
    })).toBe(true);
  });
});
