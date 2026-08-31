import { beforeEach, describe, expect, it, vi } from 'vitest';

const layerAudit = vi.hoisted(() => vi.fn());

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('./testSessionLayerAuditService', () => ({
  saveTestSessionLayerAudit: layerAudit,
}));

vi.mock('./clientLanguageUnderstanding', () => ({
  requestCanonicalLanguageUnderstanding: vi.fn(async () => {
    throw new Error('force deterministic fallback');
  }),
}));

import { droitChatService } from './droitChatService';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';

const serverState = {
  calmness: 58,
  anger: 24,
  stress: 30,
  happiness: 51,
  confidence: 63,
  surprise: 8,
  lastStatus: 'Onarılıyor',
  reactionMode: 'repairing' as const,
  relationship: {
    firstSeenAt: '2026-08-01T10:00:00.000Z',
    lastInteractionAt: '2026-08-31T18:05:00.000Z',
    interactionCount: 20,
    familiarityDays: 30,
    warmth: 55,
    trust: 56,
    positiveEvents: 4,
    negativeEvents: 2,
    conflictScore: 16,
    hurtScore: 20,
    repairProgress: 45,
    repeatedNegativeCount: 1,
    conversationState: 'repairing' as const,
    repairAttempts: 1,
  },
};

const trace = {
  whoSent: { userName: 'Ali', isNewUser: false, recognitionText: 'tanıdık' },
  relationship: {
    warmthScore: 55,
    warmthLabel: 'temkinli',
    note: 'repairing',
    familiarityDays: 30,
    interactionCount: 20,
    trustScore: 56,
    conflictScore: 16,
    hurtScore: 20,
    repairProgress: 45,
    repeatedNegativeCount: 1,
    conversationState: 'repairing' as const,
    repairAttempts: 1,
  },
  currentMood: { moodText: 'temkinli', reasonText: 'onarım sürüyor', reactionMode: 'repairing' as const },
  messageInterpretation: { intent: 'soru', sentiment: 'nötr', explanation: 'recall' },
  decision: { chosenTone: 'temkinli', explanation: 'canonical' },
  memoryUpdate: { warmthBefore: 55, warmthAfter: 55, warmthDelta: 0, moodChange: 'stabil', reason: 'test' },
};

describe('droitChatService authoritative server boundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    layerAudit.mockReset();
  });

  it('returns server final reply, state, consistency and observability without client reinterpretation', async () => {
    const responsePlan = {
      move: 'grounded_recall',
      stance: 'repairing-cautious',
      register: 'balanced',
      relationshipLevel: 'familiar',
      continueConversation: true,
      allowQuestion: false,
      allowHumor: false,
      allowAffection: false,
      allowForgiveness: false,
      allowReopeningCloseness: false,
      maxSentences: 1,
      maxWords: 14,
      emojiBudget: 0,
      reasons: ['canonical server plan'],
    };
    const worldStateAppraisal = { evidenceCount: 1, hasReportedAttribution: true };
    const worldReasoningPolicy = { mustPreserveReportedAttribution: true, mayAnswerFromMemory: true };
    const worldMemoryGuard = { changed: true, issues: [{ code: 'reported_attribution_lost' }] };
    const controlledSpontaneity = { mode: 'none', probability: 0, roll: 0.9 };
    const consistency = { accepted: true, score: 100, issues: [], checks: {} };
    const finalReply = 'Bana daha önce Mert’in yarın istifa edeceğini söylemiştin.';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: finalReply,
        providerUsed: 'openrouter',
        sessionId: 'server_session',
        turnId: 'turn_20',
        kairaInstanceId: 'kaira_a',
        kairaInstanceType: 'reference',
        timings: { serverTotalMs: 120, memoryMs: 10, kdmMs: 12, aiMs: 70, postProcessMs: 8 },
        consistency,
        kdm: {
          dynamicState: serverState,
          trace,
          semanticEvent: {
            raw: 'Mert yarın ne yapacaktı',
            normalized: 'mert yarın ne yapacaktı',
            intent: 'question',
            discourseAct: 'recall_request',
            valence: 'neutral',
            target: 'third_party',
            relationalAct: 'none',
            relationalIntensity: 0,
            severity: 0,
            insult: false,
            redLine: false,
            disrespect: 0,
            coercion: 0,
            manipulation: 0,
            privacyViolation: 0,
            apology: false,
            repairAttempt: false,
            stopQuestions: false,
            stopTalking: false,
            frustration: 0,
            emotionalLoad: 0,
            affection: 0,
            support: 0,
            compliment: 0,
          },
          behaviorProfile: { tone: 'firm', humorLevel: 0, curiosity: 0.1, behaviorDirectives: [], debugMatrix: { synthesizedParameters: {} } },
          worldStateAppraisal,
          worldReasoningPolicy,
          worldMemoryGuard,
          responsePlan,
          controlledSpontaneity,
        },
      }),
    } as Response);

    const result = await droitChatService.sendMessage({
      userMessage: 'Mert yarın ne yapacaktı',
      personality: NEUTRAL_DROIT_PERSONALITY,
      dynamicState: serverState,
      history: [],
      provider: 'openrouter',
      userId: 'authority_user',
      userName: 'Ali',
      sessionId: 'client_session',
      kairaInstanceId: 'kaira_a',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.reply).toBe(finalReply);
    expect(result.dynamicState).toEqual(serverState);
    expect(result.reasoningTrace).toEqual(trace);
    expect(result.consistency).toBe(consistency);
    expect(result.responsePlan).toBe(responsePlan);
    expect(result.worldStateAppraisal).toBe(worldStateAppraisal);
    expect(result.worldReasoningPolicy).toBe(worldReasoningPolicy);
    expect(result.worldMemoryGuard).toBe(worldMemoryGuard);
    expect(result.controlledSpontaneity).toBe(controlledSpontaneity);
    expect(result.providerUsed).toBe('openrouter');
    expect(result.sessionId).toBe('server_session');
    expect(result.turnId).toBe('turn_20');
    expect(result.kairaInstanceId).toBe('kaira_a');
    expect(layerAudit).toHaveBeenCalledTimes(1);
  });
});
