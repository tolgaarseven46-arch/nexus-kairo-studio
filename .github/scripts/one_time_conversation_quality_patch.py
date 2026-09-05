from pathlib import Path
import re

def rw(path, fn):
    p=Path(path); s=p.read_text(); n=fn(s); assert n!=s, f'no change: {path}'; p.write_text(n)

def rep(s, old, new, count=1):
    assert old in s, f'missing pattern: {old[:120]}'
    return s.replace(old,new,count)

# 1) Plan-level social move representation.
rw('src/types/kairaBehaviorPlan.ts', lambda s: rep(s,
'''export type KairaExpressionMode =\n''',
'''export type KairaSocialMove =\n  | "none"\n  | "accept_repair"\n  | "reciprocate_nonromantic_closeness"\n  | "warm_deflect"\n  | "set_boundary"\n  | "maintain_boundary";\n\nexport type KairaExpressionMode =\n'''))

def patch_dialogue(s):
    s=rep(s, '  type SemanticRepairSignal,\n} from "./semanticEventEngine";', '  type SemanticRepairSignal,\n  type RelationalAct,\n} from "./semanticEventEngine";')
    s=rep(s, '  | "complete_social_routine"\n  | "natural_reaction";', '  | "complete_social_routine"\n  | "respond_to_relational_bid"\n  | "natural_reaction";')
    s=rep(s, '  repairSignal?: SemanticRepairSignal;\n', '  repairSignal?: SemanticRepairSignal;\n  relationalAct?: RelationalAct;\n')
    s=rep(s, '  "complete_social_routine",\n]);', '  "complete_social_routine",\n  "respond_to_relational_bid",\n]);')
    marker='''  if (event.intent === "banter") {\n'''
    block='''  const directRelationalBid =\n    event.target === "kaira" &&\n    (event.relationalAct === "closeness_bid" ||\n      event.relationalAct === "reconciliation_attempt" ||\n      event.relationalAct === "repair_probe" ||\n      event.relationalAct === "reassurance_seek" ||\n      event.intent === "affection" ||\n      (event.intent === "command" && event.affection > 0));\n  if (directRelationalBid) {\n    return {\n      move: "respond_to_relational_bid",\n      relationalAct: event.relationalAct,\n      allowFollowUpQuestion: false,\n      allowSpeculation: false,\n      maxSentences: 1,\n      maxWords: 12,\n      hasSupportedTargetClaim: false,\n      reason:\n        "Kullanıcı Kaira'ya doğrudan ilişkisel/yakınlık hamlesi yaptı. Generic acknowledgement ile geçiştirme; canonical behavior planın izinlerine göre kabul, onarım-kabulü, sıcak geçiştirme veya sınır koyma hareketlerinden birini açıkça gerçekleştir.",\n    };\n  }\n\n'''
    s=rep(s, marker, block+marker)
    s=rep(s, '- Obligation: ${plan.obligation ? `${plan.obligation.type}; yalnız acknowledgement ile kapanamaz` : "yok"}\n', '- Obligation: ${plan.obligation ? `${plan.obligation.type}; yalnız acknowledgement ile kapanamaz` : "yok"}\n- Relational act: ${plan.relationalAct ?? "none"}\n')
    needle='''  if (\n    plan.obligation?.satisfactionCriteria.forbiddenResponseClasses.includes("acknowledgement_only") &&\n    KAIRA_SHORT_ACK_RE.test(reply.trim())\n  ) {\n'''
    add='''  if (plan.move === "respond_to_relational_bid" && KAIRA_SHORT_ACK_RE.test(reply.trim())) {\n    issues.push("Relational bid generic acknowledgement ile geçiştirilemez; anlamlı sosyal hareket gerekli");\n  }\n'''
    s=rep(s, needle, add+needle)
    s=rep(s, '  effectiveAllowQuestion = plan.allowFollowUpQuestion,\n): string | null {', '  effectiveAllowQuestion = plan.allowFollowUpQuestion,\n  relationalFallback?: string | null,\n): string | null {')
    s=rep(s, '  if (plan.move === "natural_reaction")\n    return plan.repeatGuard?.act === "agreement_ack" ? "devam edelim" : "he anladım";\n', '  if (plan.move === "respond_to_relational_bid") return relationalFallback || null;\n  if (plan.move === "natural_reaction")\n    return plan.repeatGuard?.act === "agreement_ack" ? "devam edelim" : "he anladım";\n')
    return s
rw('src/services/kairoDialogueDecisionEngine.ts', patch_dialogue)

def patch_resolver(s):
    s=rep(s, '  KairaPlanUncertainty,\n  SoftTendencyProfile,', '  KairaPlanUncertainty,\n  KairaSocialMove,\n  SoftTendencyProfile,')
    s=rep(s, '  projections: KairaPlanProjections;\n', '  projections: KairaPlanProjections;\n  socialMove: KairaSocialMove;\n')
    marker='''  // WHAT only. These labels say which semantic obligations must be preserved;\n'''
    block='''  let socialMove: KairaSocialMove = "none";\n  if (dialogue.move === "respond_to_relational_bid") {\n    if (hard.hardDisengage) socialMove = "maintain_boundary";\n    else if (hard.mustAcknowledgeBoundary || contract.stance !== "open") socialMove = "set_boundary";\n    else if (dialogue.relationalAct === "reconciliation_attempt" && allowReopeningCloseness) socialMove = "accept_repair";\n    else if (allowAffection && dialogue.relationalAct === "closeness_bid") socialMove = "reciprocate_nonromantic_closeness";\n    else socialMove = soft.guardedness >= 0.55 ? "set_boundary" : "warm_deflect";\n    rationale.push(`social_move:${socialMove}`);\n  }\n\n'''
    s=rep(s, marker, block+marker)
    s=rep(s, '  if (preserveAmbiguity) {\n', '  if (socialMove !== "none") requiredContent.push(`social_move:${socialMove}`);\n  if (preserveAmbiguity) {\n')
    s=rep(s, '    projections: {\n', '    socialMove,\n    projections: {\n')
    return s
rw('src/services/kairaPlanResolver.ts', patch_resolver)

def patch_response_plan(s):
    s=rep(s, 'import type { KairaPlanProjections, KairaPlanUncertainty } from "../types/kairaBehaviorPlan";', 'import type { KairaPlanProjections, KairaPlanUncertainty, KairaSocialMove } from "../types/kairaBehaviorPlan";')
    s=rep(s, '  projections?: KairaPlanProjections;\n}', '  projections?: KairaPlanProjections;\n  socialMove?: KairaSocialMove;\n}')
    s=rep(s, '    projections: resolved.projections,\n', '    projections: resolved.projections,\n    socialMove: resolved.socialMove,\n')
    s=rep(s, '    `counterFlirt=${plan.counterFlirtAllowed === true ? "allowed" : "forbidden"}`,\n', '    `counterFlirt=${plan.counterFlirtAllowed === true ? "allowed" : "forbidden"}`,\n    `socialMove=${plan.socialMove ?? "none"}`,\n')
    s=rep(s, '    plan.requiredContent?.includes("preserve_ambiguity")\n', '    plan.socialMove && plan.socialMove !== "none"\n      ? "SOSYAL HAREKET ZORUNLULUĞU: Bu tur ilişkisel bir hamleye cevap veriyorsun. socialMove alanındaki hareketi açıkça gerçekleştir; yalnızca he/hee/hmm/anladım/tamam gibi generic acknowledgement ile geçiştirme."\n      : "",\n    plan.requiredContent?.includes("preserve_ambiguity")\n')
    s=rep(s, 'const FORGIVENESS_RE =', 'const SOCIAL_ACK_ONLY_RE = /^(?:he|hee|hmm|anladım|he anladım|tamam|tamamdır)[.!…]*$/iu;\nconst FORGIVENESS_RE =')
    s=rep(s, '  if (!plan.allowQuestion && looksLikeKairaQuestionAct(text)) issues.push("response_plan_question_blocked");\n', '  if (!plan.allowQuestion && looksLikeKairaQuestionAct(text)) issues.push("response_plan_question_blocked");\n  if (plan.socialMove && plan.socialMove !== "none" && SOCIAL_ACK_ONLY_RE.test(text)) issues.push("response_plan_social_move_missing");\n')
    s += '''\n\nexport function kairaSocialMoveFallback(plan: KairaResponsePlan): string | null {\n  switch (plan.socialMove) {\n    case "accept_repair": return "tamam, barışalım";\n    case "reciprocate_nonromantic_closeness": return "gel bakalım";\n    case "warm_deflect": return "yok o kadar değil";\n    case "set_boundary": return "onu istemiyorum";\n    case "maintain_boundary": return "hayır, bu sınır değişmedi";\n    default: return null;\n  }\n}\n'''
    return s
rw('src/services/kairaResponsePlan.ts', patch_response_plan)

# 2) Local renderer semantic-richness eligibility.
def patch_local(s):
    marker='''  // The dialogue decision must have chosen a trivial move (or be absent for a\n'''
    block='''  // Fast local rendering is only for semantically trivial routines. A current\n  // turn that asks for knowledge/causality, carries a typed relational act, or\n  // describes a third-party emotional event must stay on the full generation path.\n  if (\n    event.intent === "question" ||\n    event.intent === "information_request" ||\n    event.knowledgeQuery ||\n    event.relationalAct !== "none" ||\n    (event.target === "third_party" && event.emotionalLoad >= 0.35)\n  ) return null;\n\n'''
    return rep(s, marker, block+marker)
rw('src/services/kairoLocalLanguageEngine.ts', patch_local)

# 3) Entity/semantic target consistency: support colloquial comitative forms and reconcile from resolved evidence.
def patch_entities(s):
    s=rep(s, '  "benimle",\n]);', '  "benimle",\n  "benle",\n]);')
    s=rep(s, '  "seninle",\n]);', '  "seninle",\n  "senle",\n]);')
    return s
rw('src/services/entityResolutionEngine.ts', patch_entities)

def patch_understanding(s):
    marker='''function buildResult(\n'''
    block='''function reconcileSemanticTargetWithEntityResolution(\n  interpretation: SemanticInterpretation,\n  entityResolution: EntityResolutionResult,\n): SemanticInterpretation {\n  if (interpretation.target !== "third_party") return interpretation;\n  const explicitKairaReference = entityResolution.references.some((ref) =>\n    (ref.role === "second_person" || ref.role === "character") &&\n    ref.resolvedId === "kaira" &&\n    ref.confidence >= 0.9\n  );\n  const explicitThirdPartyReference = entityResolution.references.some((ref) =>\n    ref.role === "named_person" && ref.resolvedId !== "current_user" && ref.resolvedId !== "kaira"\n  ) || entityResolution.namedPeople.length > 0;\n  const relationalAct = interpretation.discourseFacets.relationalAct;\n  const dyadicSemantic = relationalAct !== "none" ||\n    interpretation.primaryIntent === "affection" ||\n    interpretation.primaryIntent === "repair" ||\n    interpretation.primaryIntent === "command";\n  if (!explicitKairaReference || explicitThirdPartyReference || !dyadicSemantic) return interpretation;\n  return {\n    ...interpretation,\n    target: "kaira",\n    uncertainty: {\n      ...interpretation.uncertainty,\n      target: Math.min(interpretation.uncertainty.target, 0.2),\n    },\n  };\n}\n\n'''
    s=rep(s, marker, block+marker)
    s=rep(s, '  const projected = projectSemanticEvent(interpretation);\n', '  const reconciledInterpretation = reconcileSemanticTargetWithEntityResolution(interpretation, entityResolution);\n  const projected = projectSemanticEvent(reconciledInterpretation);\n')
    s=rep(s, '    interpretation,\n    event:', '    interpretation: reconciledInterpretation,\n    event:', 1)
    return s
rw('src/services/languageUnderstandingService.ts', patch_understanding)

# 4) Complaint/accountability must not be labeled as insult without an explicit typed insult/mockery.
def patch_bridge(s):
    marker='''export function semanticNegativePattern(interp: SemanticInterpretation): string | null {\n'''
    insert='''export function semanticNegativePattern(interp: SemanticInterpretation): string | null {\n  const explicitInsultOrMockery =\n    interp.primaryIntent === "insult" ||\n    interp.secondarySocialActs.includes("insult") ||\n    interp.secondarySocialActs.includes("mockery");\n  if (interp.primaryIntent === "complaint" && !explicitInsultOrMockery) return null;\n'''
    return rep(s, marker, insert)
rw('src/services/kdmRelationshipReducerBridge.ts', patch_bridge)

def patch_complaint_policy(s):
    old='''  const independentHarmAct = interp.secondarySocialActs.some((act) =>\n    INDEPENDENT_HARM_ACTS.has(act),\n  );\n'''
    new='''  const independentHarmAct = interp.secondarySocialActs.some((act) =>\n    act === "insult" ||\n    act === "coercion" ||\n    act === "manipulation" ||\n    act === "mockery" ||\n    act === "privacy_violation",\n  );\n'''
    s=rep(s, old,new)
    s=rep(s, '    interp.severity.privacy >= RELATIONSHIP_HARM_COMPONENT_FLOOR;\n', '    interp.severity.privacy >= RELATIONSHIP_HARM_COMPONENT_FLOOR ||\n    interp.severity.aggression >= 0.2;\n', 1)
    return s
rw('src/services/kairaQuestionOnlyStopRelationshipPolicy.ts', patch_complaint_policy)

# 5) Activity permission copy.
def patch_activity(s):
    old='''    text: `Bu arada ${label} aktivitesini yapmam için izin veriyor musun? Evet ya da hayır diyebilirsin.`,\n'''
    new='''    text: label === "planladığım aktivite"\n      ? "Bu arada planladığım aktiviteyi yapmam için izin veriyor musun? Evet ya da hayır diyebilirsin."\n      : `Bu arada ${label} aktivitesini yapmam için izin veriyor musun? Evet ya da hayır diyebilirsin.`,\n'''
    return rep(s,old,new)
rw('src/services/kairaActivityPermissionChatRuntime.ts', patch_activity)

# 6) Server wires plan-owned social fallback through existing delivery/repair boundary.
def patch_server(s):
    s=rep(s, 'import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./src/services/kairaResponsePlan";', 'import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction, kairaSocialMoveFallback } from "./src/services/kairaResponsePlan";')
    pattern=re.compile(r'(buildGroundedDialogueFallback\(\n(?:(?!\n\s*\);).)*?responsePlan\.allowQuestion,)(\n\s*\);)', re.S)
    matches=list(pattern.finditer(s))
    assert len(matches)>=3, f'expected >=3 fallback calls, got {len(matches)}'
    s=pattern.sub(r'\1\n        kairaSocialMoveFallback(responsePlan),\2', s)
    return s
rw('server.ts', patch_server)

# Focused regression tests.
Path('src/services/conversationQualityMechanismRegression.test.ts').write_text(r'''import { describe, expect, it } from 'vitest';
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
''')

Path('docs/adr/0042-conversation-quality-social-move-and-grounding.md').write_text('''# ADR-0042: Conversation-quality social move and grounding boundaries\n\n## Status\nAccepted\n\n## Context\nA natural 15-turn quality session exposed five related failures after the hardening phase: Kaira-directed intimacy/repair requests collapsed to generic `he anladım`; semantically rich third-party causal turns could enter the local renderer; colloquial second-person evidence (`senle`) could disagree with semantic target; accountability complaints could be labeled as insult patterns; and generic activity permission copy duplicated the noun.\n\n## Decision\n1. DialogueDecision owns a typed `respond_to_relational_bid` move. PlanResolver resolves that move into one explicit plan-owned social action (`accept_repair`, non-romantic reciprocity, warm deflection, boundary, or boundary maintenance). Final validators may reject acknowledgement-only realization but may not choose a different action.\n2. Local rendering remains a verbalizer only and is ineligible for knowledge/causal queries, typed relational acts, or emotionally loaded third-party turns.\n3. Entity resolution recognizes ordinary Turkish comitative pronoun forms and the language-understanding gateway reconciles a conflicting third-party target only when high-confidence explicit Kaira reference exists and no explicit third party exists.\n4. Accountability complaints are not insult-pattern events without an explicit typed insult/mockery signal. Real insults remain injury-bearing.\n5. Activity permission presentation fixes generic copy without changing planner identity or dialogue authority.\n\n## Consequences\nThe changes add no parallel behavior authority. Semantic/entity reconciliation occurs inside the canonical language-understanding gateway; social action remains plan-owned; local routing consumes existing canonical semantics; and final delivery only validates the selected action.\n''')
