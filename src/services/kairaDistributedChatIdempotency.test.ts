import { describe, expect, it } from 'vitest';
import {
  createDistributedChatIdempotency,
  type DistributedChatIdempotencyBackend,
  type DistributedChatRecord,
} from './kairaDistributedChatIdempotency';

function memoryBackend<T>() {
  const records = new Map<string, DistributedChatRecord<T>>();
  const backend: DistributedChatIdempotencyBackend<T> = {
    async claim({ key, ownerToken, now, leaseMs, ttlMs }) {
      const existing = records.get(key);
      if (existing?.status === 'completed' && existing.expiresAt > now && existing.payload !== undefined) {
        return { kind: 'replay', payload: existing.payload };
      }
      if (existing?.status === 'processing' && existing.leaseUntil > now) return { kind: 'wait' };
      records.set(key, {
        status: 'processing',
        ownerToken,
        leaseUntil: now + leaseMs,
        expiresAt: now + ttlMs,
      });
      return { kind: 'owner' };
    },
    async read(key) { return records.get(key) || null; },
    async complete({ key, ownerToken, payload, now, ttlMs }) {
      const existing = records.get(key);
      if (!existing || existing.ownerToken !== ownerToken || existing.status !== 'processing') return;
      records.set(key, {
        status: 'completed',
        ownerToken,
        leaseUntil: now,
        expiresAt: now + ttlMs,
        payload,
      });
    },
    async fail({ key, ownerToken }) {
      const existing = records.get(key);
      if (existing?.status === 'processing' && existing.ownerToken === ownerToken) records.delete(key);
    },
  };
  return { backend, records };
}

describe('distributed chat idempotency', () => {
  it('allows one owner across two coordinators and replays the completed payload to the waiter', async () => {
    const { backend } = memoryBackend<{ reply: string; turnId: string }>();
    const instanceA = createDistributedChatIdempotency(backend, { pollMs: 20 });
    const instanceB = createDistributedChatIdempotency(backend, { pollMs: 20 });
    const key = 'user::kaira::request-1';

    const first = await instanceA.claim(key);
    const second = await instanceB.claim(key);
    expect(first.kind).toBe('owner');
    expect(second.kind).toBe('wait');
    if (first.kind !== 'owner' || second.kind !== 'wait') throw new Error('unexpected claim state');

    const payload = { reply: 'tek cevap', turnId: 'turn_1' };
    await instanceA.complete(key, first.ownerToken, payload);
    await expect(second.outcome).resolves.toEqual({ ok: true, payload });

    const third = await instanceB.claim(key);
    expect(third).toEqual({ kind: 'replay', payload });
  });

  it('permits takeover only after the previous lease expires', async () => {
    const { backend, records } = memoryBackend<{ reply: string }>();
    const service = createDistributedChatIdempotency(backend);
    const key = 'user::kaira::request-expired';
    records.set(key, {
      status: 'processing',
      ownerToken: 'dead-instance',
      leaseUntil: 1_000,
      expiresAt: 120_000,
    });

    const takeover = await service.claim(key, 2_000);
    expect(takeover.kind).toBe('owner');
    expect(records.get(key)?.ownerToken).not.toBe('dead-instance');
  });

  it('releases failed ownership so a retry can become the next owner', async () => {
    const { backend } = memoryBackend<{ reply: string }>();
    const service = createDistributedChatIdempotency(backend);
    const key = 'user::kaira::request-fail';
    const first = await service.claim(key);
    expect(first.kind).toBe('owner');
    if (first.kind !== 'owner') throw new Error('expected owner');
    await service.fail(key, first.ownerToken);
    const retry = await service.claim(key);
    expect(retry.kind).toBe('owner');
  });
});
