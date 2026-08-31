import { beforeEach, describe, expect, it } from 'vitest';
import {
  claimKairaChatRequest,
  completeKairaChatRequest,
  failKairaChatRequest,
  clearKairaChatIdempotencyForTests,
  kairaChatIdempotencySizeForTests,
} from './kairaChatIdempotency';

describe('kaira chat request idempotency', () => {
  beforeEach(() => clearKairaChatIdempotencyForTests());

  it('deduplicates an in-flight request and replays the completed payload', async () => {
    const key = 'user::kaira::request-1';
    const owner = claimKairaChatRequest<{ reply: string }>(key, 1000, 5000);
    const duplicate = claimKairaChatRequest<{ reply: string }>(key, 1001, 5000);

    expect(owner.kind).toBe('owner');
    expect(duplicate.kind).toBe('wait');
    expect(kairaChatIdempotencySizeForTests()).toBe(1);

    completeKairaChatRequest(key, { reply: 'tek canonical cevap' }, 1002, 5000);

    if (duplicate.kind !== 'wait') throw new Error('expected duplicate to wait');
    await expect(duplicate.outcome).resolves.toEqual({
      ok: true,
      payload: { reply: 'tek canonical cevap' },
    });

    const replay = claimKairaChatRequest<{ reply: string }>(key, 1003, 5000);
    expect(replay).toEqual({ kind: 'replay', payload: { reply: 'tek canonical cevap' } });
  });

  it('releases the claim after a real failure so retry can own it', async () => {
    const key = 'user::kaira::request-fail';
    expect(claimKairaChatRequest(key).kind).toBe('owner');
    const duplicate = claimKairaChatRequest(key);
    expect(duplicate.kind).toBe('wait');

    failKairaChatRequest(key, new Error('provider failed'));

    if (duplicate.kind !== 'wait') throw new Error('expected duplicate to wait');
    await expect(duplicate.outcome).resolves.toEqual({
      ok: false,
      errorMessage: 'provider failed',
    });
    expect(kairaChatIdempotencySizeForTests()).toBe(0);
    expect(claimKairaChatRequest(key).kind).toBe('owner');
  });
});
