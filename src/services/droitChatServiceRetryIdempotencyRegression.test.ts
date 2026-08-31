import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DroitDynamicState } from '../types/nexus';

vi.mock('../lib/firebase', () => ({ auth: { currentUser: null } }));
vi.mock('./testSessionLayerAuditService', () => ({ saveTestSessionLayerAudit: vi.fn() }));
vi.mock('./clientLanguageUnderstanding', () => ({
  requestCanonicalLanguageUnderstanding: vi.fn(async () => {
    throw new Error('force local semantic fallback');
  }),
}));

import { droitChatService } from './droitChatService';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';
import { clearKairaChatRetryIdentityForTests } from './kairaChatRetryIdentity';

const state: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin',
  relationship: {
    interactionCount: 3,
    lastInteractionAt: '2026-09-01T10:00:00.000Z',
    conversationState: 'repairing',
    hurtScore: 0,
    conflictScore: 0,
  },
};

describe('droitChatService timeout/network retry idempotency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearKairaChatRetryIdentityForTests();
  });

  it('reuses requestId after a failed transport attempt with unchanged pre-state', async () => {
    const bodies: any[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body || '{}')));
      throw new Error('network dropped after server may have accepted request');
    });

    const options = {
      userMessage: 'naber kanka',
      personality: NEUTRAL_DROIT_PERSONALITY,
      dynamicState: state,
      history: [],
      provider: 'openrouter' as const,
      userId: 'retry_user',
      userName: 'Mert',
      kairaInstanceId: 'kaira_retry_test',
    };

    await expect(droitChatService.sendMessage(options)).rejects.toThrow('network dropped');
    await expect(droitChatService.sendMessage(options)).rejects.toThrow('network dropped');

    expect(bodies).toHaveLength(2);
    expect(bodies[0].requestId).toMatch(/^kaira_/);
    expect(bodies[1].requestId).toBe(bodies[0].requestId);
    expect(bodies[1].userMessage).toBe(bodies[0].userMessage);
    expect(bodies[1].kairaInstanceId).toBe(bodies[0].kairaInstanceId);
  });
});
