import { beforeEach, describe, expect, it } from 'vitest';
import {
  acquireKairaChatRequestIdentity,
  buildKairaChatRetryFingerprint,
  clearKairaChatRetryIdentityForTests,
} from './kairaChatRetryIdentity';
import {
  createDistributedChatIdempotency,
  type DistributedChatIdempotencyBackend,
  type DistributedChatRecord,
} from './kairaDistributedChatIdempotency';
import type { DroitDynamicState } from '../types/nexus';

const preState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin',
  relationship: {
    firstSeenAt: '2026-08-01T10:00:00.000Z',
    lastInteractionAt: '2026-09-01T10:00:00.000Z',
    interactionCount: 5,
    familiarityDays: 31,
    warmth: 60,
    trust: 60,
    positiveEvents: 2,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: 'active',
  },
};

function sharedBackend<T>(): DistributedChatIdempotencyBackend<T> {
  const records = new Map<string, DistributedChatRecord<T>>();
  return {
    async claim({ key, ownerToken, now, leaseMs, ttlMs }) {
      const existing = records.get(key);
      if (existing?.status === 'completed' && existing.expiresAt > now && existing.payload !== undefined) return { kind: 'replay', payload: existing.payload };
      if (existing?.status === 'processing' && existing.leaseUntil > now) return { kind: 'wait' };
      records.set(key, { status: 'processing', ownerToken, leaseUntil: now + leaseMs, expiresAt: now + ttlMs });
      return { kind: 'owner' };
    },
    async read(key) { return records.get(key) || null; },
    async complete({ key, ownerToken, payload, now, ttlMs }) {
      const current = records.get(key);
      if (!current || current.status !== 'processing' || current.ownerToken !== ownerToken) return;
      records.set(key, { status: 'completed', ownerToken, leaseUntil: now, expiresAt: now + ttlMs, payload });
    },
    async fail({ key, ownerToken }) {
      const current = records.get(key);
      if (current?.status === 'processing' && current.ownerToken === ownerToken) records.delete(key);
    },
  };
}

describe('lost response timeout -> retry end-to-end idempotency', () => {
  beforeEach(() => clearKairaChatRetryIdentityForTests());

  it('replays the first completed turn on another instance instead of advancing state twice', async () => {
    const fingerprint = buildKairaChatRetryFingerprint({
      userId: 'retry_user',
      kairaInstanceId: 'kaira_reference',
      userMessage: 'naber kanka',
      dynamicState: preState,
    });
    const requestId = acquireKairaChatRequestIdentity(fingerprint, 1000);
    const key = `retry_user::kaira_reference::${requestId}`;
    const backend = sharedBackend<{ reply: string; turnId: string; interactionCount: number }>();
    const instanceA = createDistributedChatIdempotency(backend, { pollMs: 20 });
    const instanceB = createDistributedChatIdempotency(backend, { pollMs: 20 });
    let stateTransitions = 0;

    const first = await instanceA.claim(key, 1100);
    expect(first.kind).toBe('owner');
    if (first.kind !== 'owner') throw new Error('first instance must own the turn');
    stateTransitions += 1;
    const firstPayload = { reply: 'iyidir kanka senden', turnId: 'turn_once', interactionCount: 6 };
    await instanceA.complete(key, first.ownerToken, firstPayload, 1200);

    // Client never received that response, so success identity was never cleared.
    const retryRequestId = acquireKairaChatRequestIdentity(fingerprint, 1500);
    expect(retryRequestId).toBe(requestId);

    const retry = await instanceB.claim(key, 1600);
    expect(retry).toEqual({ kind: 'replay', payload: firstPayload });
    expect(stateTransitions).toBe(1);
  });
});
