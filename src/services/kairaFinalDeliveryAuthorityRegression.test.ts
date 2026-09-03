import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { interpretSemanticEvent } from './semanticEventEngine';
import { buildBehaviorContract } from './behaviorContract';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from './kairaResponsePlan';
import { enforceKairoResponse } from './kairoResponseConsistency';
import type { WorldEventObservation } from './worldModelEventStore';
import { rankWorldEventObservations } from './worldEventRetrieval';
import { appraiseRetrievedWorldState } from './worldStateAppraisal';
import { deriveWorldReasoningPolicy } from './worldReasoningPolicy';
import { enforceWorldModelRecallResponse } from './worldModelResponseGuard';

function finalize(message: string, draft: string, previousState?: ReturnType<typeof analyzeKdmInteraction>['nextDynamicState']) {
  const kdm = analyzeKdmInteraction(message, undefined, previousState);
  const event = interpretSemanticEvent(message);
  const contract = buildBehaviorContract(kdm.nextDynamicState, kdm.trace, event);
  const dialogue = planDialogueResponse([], message, 'Ali', event);
  const speech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, kdm.nextDynamicState, kdm.trace);
  const plan = buildKairaResponsePlan(contract, dialogue, speech);
  const enforced = enforceKairoResponse(draft, kdm.trace, {
    continueConversation: plan.continueConversation,
    humorAllowed: plan.allowHumor,
    askQuestion: plan.allowQuestion,
    emojiBudget: plan.emojiBudget,
    maxSentences: plan.maxSentences,
    maxWords: plan.maxWords,
    conversationState: contract.conversationState,
    behaviorContract: contract,
  });
  return { ...kdm, event, contract, dialogue, speech, plan, enforced };
}

function reportedMertPlan(): WorldEventObservation {
  return {
    id: 'mert-plan', userId: 'final_delivery_user', kairaInstanceId: 'kaira_a', sessionId: 'final_delivery_session', speakerName: 'Ali', kind: 'reported_claim', status: 'grounded', createdAt: '2026-08-31T18:00:00.000Z',
    event: { raw: 'Mert yarın istifa edeceğini söyledi', eventType: 'general', actor: { name: 'Mert', source: 'explicit_name', confidence: 0.99 }, target: { name: 'Mert', source: 'explicit_name', confidence: 0.99 }, reportedSpeech: true, certainty: 0.95, ambiguities: [], evidence: [], polarity: 'positive', temporal: { relation: 'future', asksLatest: false }, proposition: { key: 'mert|general|mert|istifa', predicate: 'general', actorKey: 'mert', targetKey: 'mert', contentKey: 'istifa' }, modality: { kind: 'plan', strength: 0.8 }, lifecycle: { kind: 'unspecified', strength: 0 } },
  };
}

describe('final delivery authority regression', () => {
  it('does not let an over-familiar playful draft erase qualitative hurt', () => {
    const insult = analyzeKdmInteraction('sen salaksın');
    expect(insult.nextDynamicState.reactionMode).not.toBe('neutral');
    const result = finalize('selam tekrar', 'hahaha kanka sorun yok ya 😂', insult.nextDynamicState);
    expect(result.enforced.changed).toBe(true);
    expect(result.enforced.reply.toLocaleLowerCase('tr-TR')).not.toContain('kanka');
    expect(result.enforced.reply.toLocaleLowerCase('tr-TR')).not.toContain('hahaha');
    expect(result.enforced.reply).not.toContain('😂');
    expect(findKairaResponsePlanIssues(result.enforced.reply, result.plan)).toEqual([]);
  });

  it('keeps conversation open while removing a forbidden follow-up question', () => {
    const result = finalize('moralim bozuk, soru sorma artık', 'anladım. ne oldu?');
    expect(result.plan.continueConversation).toBe(true);
    expect(result.plan.allowQuestion).toBe(false);
    expect(result.enforced.reply).not.toContain('?');
    expect(result.enforced.reply.length).toBeGreaterThan(0);
    expect(findKairaResponsePlanIssues(result.enforced.reply, result.plan)).toEqual([]);
  });

  it('hard-closes a stop-talking turn even if the model tries to reopen chat', () => {
    const result = finalize('sus artık', 'tamam kanka, ne oldu? hahaha 😂');
    expect(result.plan.continueConversation).toBe(false);
    expect(result.plan.allowQuestion).toBe(false);
    expect(result.plan.allowHumor).toBe(false);
    expect(result.enforced.reply).not.toContain('?');
    expect(result.enforced.reply.toLocaleLowerCase('tr-TR')).not.toContain('hahaha');
    expect(result.enforced.reply).not.toContain('😂');
    expect(findKairaResponsePlanIssues(result.enforced.reply, result.plan)).toEqual([]);
  });

  it('repairs a recall draft that promotes a reported claim into certain fact', () => {
    const message = 'Mert yarın ne yapacaktı';
    const result = finalize(message, 'Mert yarın istifa edecek.');
    expect(result.plan.move).toBe('grounded_recall');
    expect(findKairaResponsePlanIssues(result.enforced.reply, result.plan)).toEqual([]);
    const retrieved = rankWorldEventObservations(message, [reportedMertPlan()], 5, '2026-08-31T18:10:00.000Z');
    const appraisal = appraiseRetrievedWorldState(retrieved);
    const guarded = enforceWorldModelRecallResponse(result.enforced.reply, retrieved, { appraisal, policy: deriveWorldReasoningPolicy(appraisal) });
    expect(guarded.changed).toBe(true);
    expect(guarded.reply).toContain('Mert');
    expect(guarded.reply).toMatch(/Bana daha önce|demiştin|kayda göre/iu);
    expect(guarded.reply).not.toBe('Mert yarın istifa edecek.');
    expect(findKairaResponsePlanIssues(guarded.reply, result.plan)).toEqual([]);
  });
});