import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { interpretSemanticEvent } from './semanticEventEngine';
import { planDialogueResponse, buildGroundedDialogueFallback } from './kairoDialogueDecisionEngine';
import { buildBehaviorContract } from './behaviorContract';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from './kairaResponsePlan';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';

describe('provider failure fallback regression', () => {
  it('wires initial generation failure to a deterministic fallback without teaching that fallback as learned style', () => {
    const server = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    expect(server).toContain('let providerFailureFallbackUsed = false;');
    expect(server).toContain('catch (generationError)');
    expect(server).toContain('if (!providerFallback) throw generationError;');
    expect(server).toContain('activeAiProviderUsed = "deterministic_fallback";');
    expect(server).toContain('consistency.accepted && !providerFailureFallbackUsed');
  });

  it('uses a plan-safe deterministic canonical greeting fallback when the provider is unavailable', () => {
    const message = 'selam kaira';
    const event = interpretSemanticEvent(message);
    const kdm = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, undefined, event);
    const dialogue = planDialogueResponse([], message, 'Ali', event);
    const contract = buildBehaviorContract(kdm.nextDynamicState, kdm.trace, event);
    const speech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, kdm.nextDynamicState, kdm.trace);
    const plan = buildKairaResponsePlan(contract, dialogue, speech);
    const fallback = buildGroundedDialogueFallback(dialogue, [], message, 'Ali', undefined, plan.allowQuestion);

    expect(event.socialRoutine).toBe('greeting');
    expect(dialogue).toMatchObject({
      move: 'complete_social_routine',
      socialRoutine: 'greeting',
      allowFollowUpQuestion: false,
      allowSpeculation: false,
    });
    expect(fallback).toBe('selam');
    expect(findKairaResponsePlanIssues(fallback!, plan)).toEqual([]);
  });

  it('respects stopQuestions when falling back on an emotional opening', () => {
    const message = 'moralim bozuk, soru sorma artık';
    const event = interpretSemanticEvent(message);
    const kdm = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, undefined, event);
    const dialogue = planDialogueResponse([], message, 'Ali', event);
    const contract = buildBehaviorContract(kdm.nextDynamicState, kdm.trace, event);
    const speech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, kdm.nextDynamicState, kdm.trace);
    const plan = buildKairaResponsePlan(contract, dialogue, speech);
    const fallback = buildGroundedDialogueFallback(dialogue, [], message, 'Ali', undefined, plan.allowQuestion);

    expect(dialogue.move).toBe('invite_emotional_context');
    expect(plan.allowQuestion).toBe(false);
    expect(fallback).toBe('hmm');
    expect(findKairaResponsePlanIssues(fallback!, plan)).toEqual([]);
  });

  it('does not invent a factual answer when the provider fails', () => {
    const message = 'Türkiye’nin başkenti neresi?';
    const event = interpretSemanticEvent(message);
    const dialogue = planDialogueResponse([], message, 'Ali', event);
    const fallback = buildGroundedDialogueFallback(dialogue, [], message, 'Ali');

    expect(dialogue.move).toBe('answer_or_clarify');
    expect(fallback).toBeNull();
  });
});
