import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMock = vi.hoisted(() => ({
  records: new Map<string, any>(),
  queue: Promise.resolve() as Promise<unknown>,
}));

vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  runTransaction: async (_db: unknown, callback: (tx: any) => Promise<any>) => {
    const execute = async () => callback({
      get: async (ref: { id: string }) => ({
        exists: () => firestoreMock.records.has(ref.id),
        data: () => firestoreMock.records.get(ref.id),
      }),
      set: (ref: { id: string }, value: unknown) => firestoreMock.records.set(ref.id, value),
      delete: (ref: { id: string }) => firestoreMock.records.delete(ref.id),
    });
    const result = firestoreMock.queue.then(execute, execute);
    firestoreMock.queue = result.then(() => undefined, () => undefined);
    return result;
  },
  getDoc: async (ref: { id: string }) => ({
    exists: () => firestoreMock.records.has(ref.id),
    data: () => firestoreMock.records.get(ref.id),
  }),
  deleteDoc: async (ref: { id: string }) => {
    firestoreMock.records.delete(ref.id);
  },
}));

import { firestoreChatIdempotencyBackend } from './kairaFirestoreChatIdempotency';

describe('Firestore chat idempotency transaction races', () => {
  beforeEach(() => {
    firestoreMock.records.clear();
    firestoreMock.queue = Promise.resolve();
  });

  it('grants exactly one owner when two instances claim the same request concurrently', async () => {
    const input = { key: 'user::kaira::request-1', now: 1_000, leaseMs: 45_000, ttlMs: 120_000 };
    const [a, b] = await Promise.all([
      firestoreChatIdempotencyBackend.claim({ ...input, ownerToken: 'instance-a' }),
      firestoreChatIdempotencyBackend.claim({ ...input, ownerToken: 'instance-b' }),
    ]);

    expect([a.kind, b.kind].sort()).toEqual(['owner', 'wait']);
  });

  it('does not let a stale owner release a lease that a new owner took over', async () => {
    const key = 'user::kaira::request-takeover';
    const first = await firestoreChatIdempotencyBackend.claim({
      key,
      ownerToken: 'old-owner',
      now: 1_000,
      leaseMs: 5_000,
      ttlMs: 120_000,
    });
    expect(first.kind).toBe('owner');

    const takeover = await firestoreChatIdempotencyBackend.claim({
      key,
      ownerToken: 'new-owner',
      now: 7_000,
      leaseMs: 5_000,
      ttlMs: 120_000,
    });
    expect(takeover.kind).toBe('owner');

    await firestoreChatIdempotencyBackend.fail({ key, ownerToken: 'old-owner' });
    const current = await firestoreChatIdempotencyBackend.read(key);
    expect(current?.status).toBe('processing');
    expect(current?.ownerToken).toBe('new-owner');
  });
});
