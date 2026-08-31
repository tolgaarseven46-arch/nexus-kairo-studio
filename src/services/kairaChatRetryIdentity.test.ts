import { beforeEach, describe, expect, it } from 'vitest';
import type { DroitDynamicState } from '../types/nexus';
import {
  acquireKairaChatRequestIdentity,
  buildKairaChatRetryFingerprint,
  completeKairaChatRequestIdentity,
  clearKairaChatRetryIdentityForTests,
} from './kairaChatRetryIdentity';

const baseState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin',
  relationship: {
    interactionCount: 4,
    lastInteractionAt: '2026-09-01T10:00:00.000Z',
    conversationState: 'repairing',
    hurtScore: 0,
    conflictScore: 0,
  },
};

describe('kaira chat retry identity', () => {
  beforeEach(() => clearKairaChatRetryIdentityForTests());

  it('reuses the same request id for the same logical retry', () => {
    const fingerprint = buildKairaChatRetryFingerprint({
      userId: 'test_user_x',
      kairaInstanceId: 'kaira_reference',
      userMessage: '  Naber   kanka ',
      dynamicState: baseState,
    });

    const first = acquireKairaChatRequestIdentity(fingerprint, 1000);
    const retry = acquireKairaChatRequestIdentity(fingerprint, 1500);
    expect(retry).toBe(first);
  });

  it('changes identity when canonical pre-state advances and clears after success', () => {
    const before = buildKairaChatRetryFingerprint({
      userId: 'test_user_x',
      kairaInstanceId: 'kaira_reference',
      userMessage: 'naber kanka',
      dynamicState: baseState,
    });
    const after = buildKairaChatRetryFingerprint({
      userId: 'test_user_x',
      kairaInstanceId: 'kaira_reference',
      userMessage: 'naber kanka',
      dynamicState: {
        ...baseState,
        relationship: {
          ...baseState.relationship,
          interactionCount: 5,
          lastInteractionAt: '2026-09-01T10:01:00.000Z',
        },
      },
    });

    expect(after).not.toBe(before);
    const first = acquireKairaChatRequestIdentity(before, 1000);
    completeKairaChatRequestIdentity(before);
    const laterIntentionalRepeat = acquireKairaChatRequestIdentity(before, 1100);
    expect(laterIntentionalRepeat).not.toBe(first);
  });
});
