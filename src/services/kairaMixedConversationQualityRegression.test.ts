import { describe, expect, it, vi } from 'vitest';
import type { DroitDynamicState } from '../types/nexus';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
import { interpretSemanticEvent } from './semanticEventEngine';
import { buildBehaviorContract } from './behaviorContract';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';
import type { ConversationTurn } from './kairoConversationGrounding';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import { buildKairaResponsePlan, type KairaResponsePlan } from './kairaResponsePlan';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';
import type { WorldEventObservation } from './worldModelEventStore';
import { rankWorldEventObservations } from './worldEventRetrieval';
import { appraiseRetrievedWorldState } from './worldStateAppraisal';
import { deriveWorldReasoningPolicy } from './worldReasoningPolicy';
import { enforceWorldModelRecallResponse } from './worldModelResponseGuard';

const messages = [
  'selam kaira',
  'naber',
  'Mert yarın istifa edeceğini söyledi',
  'haklı bence',
  'müdürle konuşacakmış',
  'teşekkürler',
  'bugün iş çok yoğundu',
  'neyse hallederiz',
  'salak mısın ya',
  'selam tekrar',
  'Mert yarın ne yapacaktı',
  'tamam',
  'dün biraz sert konuştum',
  'kusura bakma',
  'özür dilerim',
  'naber şimdi',
  'iyi geceler',
  'teşekkürler',
  'Mert ne yapacaktı hatırlıyor musun',
  'görüşürüz',
] as const;

function reportedMertPlan(): WorldEventObservation {
  return {
    id: 'mert-plan',
    userId: 'mixed_quality_user',
    kairaInstanceId: 'kaira_a',
    sessionId: 'mixed_quality_session',
    speakerName: 'current_user',
    kind: 'reported_claim',
    status: 'grounded',
    createdAt: '2026-08-31T18:00:00.000Z',
    event: {
      raw: 'Mert yarın istifa edeceğini söyledi',
      eventType: 'general',
      actor: { name: 'Mert', source: 'explicit_name', confidence: 0.99 },
      target: { name: 'Mert', source: 'explicit_name', confidence: 0.99 },
      reportedSpeech: true,
      certainty: 0.95,
      ambiguities: [],
      evidence: [],
      polarity: 'positive',
      temporal: { relation: 'future', asksLatest: false },
      proposition: {
        key: 'mert|general|mert|istifa',
        predicate: 'general',
        actorKey: 'mert',
        targetKey: 'mert',
        contentKey: 'istifa',
      },
      modality: { kind: 'plan', strength: 0.8 },
      lifecycle: { kind: 'unspecified', strength: 0 },
    },
  };
}

describe('mixed local/AI + recall + relationship repair quality regression', () => {
  it('keeps routing, canonical response plan, qualitative state and reported recall coherent across one 20-turn flow', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-31T18:00:00.000Z').getTime());

    let state: DroitDynamicState | undefined;
    const history: ConversationTurn[] = [];
    const routes: Array<'local_language' | 'ai'> = [];
    const replies: Array<string | undefined> = [];
    const states: DroitDynamicState[] = [];
    const responsePlans: KairaResponsePlan[] = [];
    const worldEvents: WorldEventObservation[] = [];
    const recallGuards: ReturnType<typeof enforceWorldModelRecallResponse>[] = [];

    for (const message of messages) {
      const result = analyzeKdmInteraction(message, undefined, state);
      state = result.nextDynamicState;
      states.push(structuredClone(state));

      const semanticEvent = interpretSemanticEvent(message);
      const behaviorContract = buildBehaviorContract(state, result.trace, semanticEvent);
      const dialogueDecision = planDialogueResponse(history, message, 'Ali', semanticEvent);
      const speech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, state, result.trace);
      const responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech);
      responsePlans.push(responsePlan);

      const local = tryLocalKairoReply(
        message,
        NEUTRAL_DROIT_PERSONALITY,
        state,
        result.trace,
        'mixed_quality_user',
        dialogueDecision.move,
        responsePlan,
        semanticEvent,
        false,
      );
      routes.push(local.handled ? 'local_language' : 'ai');
      replies.push(local.reply);

      history.push({
        sender: 'user',
        text: message,
        participantId: 'mixed_quality_user',
        participantName: 'Ali',
      });
      if (local.handled && local.reply) {
        history.push({
          sender: 'droit',
          text: local.reply,
          participantId: 'kaira_a',
          participantName: 'Kaira',
          replyToParticipantId: 'mixed_quality_user',
          replyToParticipantName: 'Ali',
        });
      }

      if (message === 'Mert yarın istifa edeceğini söyledi') {
        worldEvents.push(reportedMertPlan());
      }

      if (message.includes('Mert') && (message.includes('ne yapacaktı') || message.includes('hatırlıyor musun'))) {
        const retrieved = rankWorldEventObservations(message, worldEvents, 5);
        const appraisal = appraiseRetrievedWorldState(retrieved);
        const policy = deriveWorldReasoningPolicy(appraisal);
        expect(policy.mustPreserveReportedAttribution).toBe(true);
        recallGuards.push(enforceWorldModelRecallResponse('Mert yarın istifa edecek.', retrieved));
      }
    }

    expect(states).toHaveLength(20);
    expect(responsePlans).toHaveLength(20);
    expect(routes).toContain('local_language');
    expect(routes).toContain('ai');

    const byMessage = new Map(messages.map((message, index) => [message, routes[index]]));
    expect(byMessage.get('selam kaira')).toBe('local_language');
    expect(byMessage.get('naber')).toBe('local_language');
    expect(byMessage.get('teşekkürler')).toBe('local_language');
    expect(byMessage.get('görüşürüz')).toBe('local_language');

    expect(byMessage.get('Mert yarın istifa edeceğini söyledi')).toBe('ai');
    expect(byMessage.get('Mert yarın ne yapacaktı')).toBe('ai');
    expect(byMessage.get('Mert ne yapacaktı hatırlıyor musun')).toBe('ai');
    expect(byMessage.get('salak mısın ya')).toBe('ai');
    expect(byMessage.get('kusura bakma')).toBe('ai');
    expect(byMessage.get('özür dilerim')).toBe('ai');

    expect(responsePlans[10].move).toBe('grounded_recall');
    expect(responsePlans[10].allowQuestion).toBe(false);
    expect(responsePlans[18].move).toBe('grounded_recall');
    expect(responsePlans[18].allowQuestion).toBe(false);

    const insultState = states[8];
    const postInsultGreetingState = states[9];
    const postInsultGreetingPlan = responsePlans[9];
    const firstApologyState = states[13];
    const secondApologyState = states[14];

    expect(insultState.reactionMode).not.toBe('neutral');
    expect(postInsultGreetingState.reactionMode).not.toBe('neutral');
    expect(postInsultGreetingPlan.allowHumor).toBe(false);
    expect(postInsultGreetingPlan.allowReopeningCloseness).toBe(false);
    expect((replies[9] ?? '').toLocaleLowerCase('tr-TR')).not.toContain('kanka');
    expect(
      [firstApologyState.reactionMode, secondApologyState.reactionMode].some(
        (mode) => mode === 'repairing' || mode === 'neutral',
      ),
    ).toBe(true);

    expect(recallGuards).toHaveLength(2);
    for (const guard of recallGuards) {
      expect(guard.changed).toBe(true);
      expect(guard.reply).toMatch(/Bana daha önce/iu);
      expect(guard.reply).toContain('Mert');
    }

    const interactionCounts = states.map((item) => item.relationship?.interactionCount ?? 0);
    for (let index = 1; index < interactionCounts.length; index += 1) {
      expect(interactionCounts[index]).toBeGreaterThan(interactionCounts[index - 1]);
    }

    vi.restoreAllMocks();
  });
});
