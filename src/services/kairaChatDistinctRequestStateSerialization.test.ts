import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = new Map<string, any>();

vi.mock('./kairaFirestoreChatIdempotency', () => ({
  firestoreChatIdempotencyBackend: {
    async claim({ key, ownerToken, now, leaseMs, ttlMs }: any) {
      const existing = records.get(key);
      if (existing?.status === 'completed' && existing.expiresAt > now) {
        return { kind: 'replay', payload: existing.payload };
      }
      if (existing?.status === 'processing' && existing.leaseUntil > now) return { kind: 'wait' };
      records.set(key, { status: 'processing', ownerToken, leaseUntil: now + leaseMs, expiresAt: now + ttlMs });
      return { kind: 'owner' };
    },
    async read(key: string) { return records.get(key) ?? null; },
    async complete({ key, ownerToken, payload, now, ttlMs }: any) {
      const existing = records.get(key);
      if (existing?.ownerToken === ownerToken) records.set(key, { ...existing, status: 'completed', payload, leaseUntil: now, expiresAt: now + ttlMs });
    },
    async fail({ key, ownerToken }: any) {
      if (records.get(key)?.ownerToken === ownerToken) records.delete(key);
    },
  },
}));

import {
  claimCoordinatedKairaChatRequest,
  completeCoordinatedKairaChatRequest,
  clearCoordinatedKairaChatIdempotencyForTests,
} from './kairaChatIdempotencyCoordinator';

const owner = 'user_a::kaira_default';
const firstKey = `${owner}::req_a`;
const secondKey = `${owner}::req_b`;

beforeEach(() => {
  records.clear();
  clearCoordinatedKairaChatIdempotencyForTests();
});

describe('distinct request state-owner serialization', () => {
  it('does not let two distinct request ids for the same state owner mutate concurrently', async () => {
    const first = await claimCoordinatedKairaChatRequest(firstKey);
    expect(first.kind).toBe('owner');

    let secondResolved = false;
    const secondPromise = claimCoordinatedKairaChatRequest(secondKey).then((claim) => {
      secondResolved = true;
      return claim;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(secondResolved).toBe(false);

    await completeCoordinatedKairaChatRequest(firstKey, { ok: true });
    const second = await secondPromise;
    expect(second.kind).toBe('owner');
    await completeCoordinatedKairaChatRequest(secondKey, { ok: true });
  });
});
