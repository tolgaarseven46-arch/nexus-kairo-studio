import { describe, expect, it } from 'vitest';
import { planDialogueResponse, buildGroundedDialogueFallback } from './kairoDialogueDecisionEngine';
import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaSocialMoveFallback } from './kairaResponsePlan';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
import { understandTurkishMessage } from './languageUnderstandingService';
import { semanticNegativePattern } from './kdmRelationshipReducerBridge';
import { isRelationshipNeutralAccountabilityComplaint } from './kairaQuestionOnlyStopRelationshipPolicy';
import { buildKairaActivityPermissionChatPrompt } from './kairaActivityPermissionChatRuntime';
import type { SemanticInterpretation } from '../types/semanticInterpretation';
import type { SemanticEvent } from './semanticEventEngine';

function event(overrides: Partial<SemanticEvent> = {}): SemanticEvent {
  return {
    raw: '', normalized: '', intent: 'general_chat', socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null,
    valence: 'neutral', target: 'unknown', relationalAct: 'none', relationalIntensity: 0, severity: 0, insult: false, redLine: false,
    disrespect: 0, coercion: 0, manipulation: 0, privacyViolation: 0, apology: false, repairAttempt: false,
    stopQuestions: false, stopTalking: false, frustration: 0, emotionalLoad: 0, affection: 0, support: 0, compliment: 0,
    ...overrides,
  };
}
function interpretation(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: 'semantic-interpretation@2', raw: '', normalized: '', primaryIntent: 'other', secondarySocialActs: [], target: 'unknown', valence: 'neutral',
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 }, jokingConfidence: 0.2, sincerityConfidence: 0.7,
    affection: 0, support: 0, compliment: 0, emotionalLoad: 0, apology: false, repairAttempt: false, stopRequest: false,
    discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'none', relationalIntensity: 0, stopQuestions: false, stopTalking: false },
    uncertainty: { overall: 0.2, intent: 0.2, target: 0.4, severity: 0.2 }, evidence: [], ...overrides,
  };
}

describe('conversation-quality mechanism regressions', () => {
  it('turns a Kaira-directed closeness bid into an explicit social move instead of generic acknowledgement', () => {
    const d = planDialogueResponse([], 'beni öp', 'Mert', event({ intent: 'command', target: 'kaira', relationalAct: 'closeness_bid', relationalIntensity: 0.8, affection: 0.8 }));
    expect(d.move).toBe('respond_to_relational_bid');
    const plan = buildKairaResponsePlan({ conversationState:'active', continueConversation:true, playfulness:'allowed', affection:'allowed', questions:'allowed', forgivenessGranted:true, repairStatus:'repaired', reopeningCloseness:'allowed', stance:'open', maxResponseLength:'medium', reasons:[], semanticUncertainty:0.2 } as any, d, { register:'balanced', relationshipLevel:'new', emojiLevel:0 } as any);
    expect(plan.socialMove).toBe('warm_deflect');
    expect(findKairaResponsePlanIssues('he anladım', plan)).toContain('response_plan_social_move_missing');
    const fallback = kairaSocialMoveFallback(plan);
    expect(fallback).not.toBe('he anladım');
    expect(buildGroundedDialogueFallback(d, [], 'beni öp', 'Mert', undefined, false, fallback)).toBe(fallback);
  });

  it('keeps a non-romantic reconciliation attempt meaningful when reopening is allowed', () => {
    const d = planDialogueResponse([], 'gel senle barışalım', 'Mert', event({ intent:'affection', target:'kaira', relationalAct:'reconciliation_attempt', relationalIntensity:0.8, repairAttempt:true }));
    const plan = buildKairaResponsePlan({ conversationState:'active', continueConversation:true, playfulness:'allowed', affection:'allowed', questions:'allowed', forgivenessGranted:true, repairStatus:'repaired', reopeningCloseness:'allowed', stance:'open', maxResponseLength:'medium', reasons:[], semanticUncertainty:0.2 } as any, d, { register:'balanced', relationshipLevel:'new', emojiLevel:0 } as any);
    expect(plan.socialMove).toBe('accept_repair');
    expect(kairaSocialMoveFallback(plan)).toBe('tamam, barışalım');
  });

  it('does not route a semantically rich third-party causal/emotional turn through local rendering', () => {
    const result = tryLocalKairoReply('neden ayrılmış benden', {} as any, {} as any, { decision:{ chosenTone:'balanced' } } as any, 'u', 'natural_reaction', undefined, event({ intent:'information_request', socialRoutine:'emotional_opening', target:'third_party', relationalAct:'reassurance_seek', emotionalLoad:0.6 }), false, undefined);
    expect(result.handled).toBe(false);
    expect(result.source).toBe('ai');
  });

  it('reconciles colloquial second-person evidence with a conflicting third-party semantic target', async () => {
    const result = await understandTurkishMessage('gel senle barışalım', { incomingSemanticInterpretation: interpretation({ raw:'gel senle barışalım', normalized:'gel senle barışalım', primaryIntent:'affection', target:'third_party', repairAttempt:true, discourseFacets:{ socialRoutine:'none', discourseAct:'none', repairSignal:'none', adviceRequested:false, knowledgeQuery:null, selfMemoryQuery:null, relationalAct:'reconciliation_attempt', relationalIntensity:0.8, stopQuestions:false, stopTalking:false } }), context:{ userName:'Mert', characterName:'Kaira' } });
    expect(result.entityResolution.references.some((r) => r.surface.toLocaleLowerCase('tr-TR') === 'senle' && r.resolvedId === 'kaira')).toBe(true);
    expect(result.interpretation.target).toBe('kaira');
    expect(result.event.relationshipScope).toBe('kaira_user');
  });

  it('keeps accountability complaint separate from insult-pattern injury while preserving real insults', () => {
    const complaint = interpretation({ primaryIntent:'complaint', target:'kaira', severity:{ disrespect:0.4, coercion:0, manipulation:0, privacy:0, aggression:0 }, discourseFacets:{ socialRoutine:'none', discourseAct:'confusion_or_challenge', repairSignal:'none', adviceRequested:false, knowledgeQuery:null, selfMemoryQuery:null, relationalAct:'challenge', relationalIntensity:0.5, stopQuestions:false, stopTalking:false } });
    expect(isRelationshipNeutralAccountabilityComplaint(complaint)).toBe(true);
    expect(semanticNegativePattern(complaint)).toBeNull();
    const insult = interpretation({ primaryIntent:'insult', target:'kaira', secondarySocialActs:['insult'], severity:{ disrespect:0.8, coercion:0, manipulation:0, privacy:0, aggression:0.3 } });
    expect(semanticNegativePattern(insult)).toMatch(/hakaret/);
  });

  it('does not duplicate the generic activity noun in permission copy', () => {
    const generic = buildKairaActivityPermissionChatPrompt({ requestId:'r', activityId:'internal:key' });
    expect(generic.text).toContain('planladığım aktiviteyi yapmam');
    expect(generic.text).not.toContain('aktivite aktivitesini');
    const named = buildKairaActivityPermissionChatPrompt({ requestId:'r', activityId:'id', activityType:'museum_visit' });
    expect(named.text).toContain('museum visit aktivitesini');
  });
});
