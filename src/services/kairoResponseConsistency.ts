import type { ReasoningTrace } from '../types/nexus';

export interface ResponseConsistencyResult {
  accepted: boolean;
  score: number;
  issues: string[];
  checks: {
    nonEmpty: boolean;
    length: boolean;
    intentTone: boolean;
    sentimentTone: boolean;
    decisionTone: boolean;
    relationshipTone: boolean;
    intimacyBoundary: boolean;
    traceCompleteness: boolean;
  };
}

export interface KairoResponseEnforcementRules {
  continueConversation?: boolean;
  humorAllowed?: boolean;
  askQuestion?: boolean;
  emojiLevel?: number;
  conversationState?: string;
}

export interface KairoResponseEnforcementResult {
  reply: string;
  changed: boolean;
  reasons: string[];
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR');
}

const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;
const HUMOR_MARKER_RE = /(?:\b(?:haha+h*|hehe+h*|lol)\b|😂|🤣|😄|😅|🙃|😏)/giu;
const AFFECTION_MARKER_RE = /(öp|öpüc|sarıl|kucağ|dudak|bebeğim|aşkım|tatlım|sevgilim)/iu;
const REOPEN_MARKER_RE = /(hadi\s+(?:konuş|devam)|konuşalım|devam edelim|ne yapıyorsun|naber|anlat bakalım)/iu;

function fallbackForTrace(trace: ReasoningTrace): string {
  const intent = normalize(trace?.messageInterpretation?.intent);
  if (intent.includes('özür') || intent.includes('telafi')) {
    return 'özrünü duydum ama şu an konuşmak istemiyorum';
  }
  return 'bu şekilde devam etmeyeceğim';
}

function removeQuestionSentences(text: string): string {
  const parts = text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.includes('?'));
  return parts.join(' ').trim();
}

/**
 * Deterministic enforcement gate applied AFTER generation and BEFORE persistence/user delivery.
 * KDM decisions are treated as hard behavior rules here; the model is only the verbalizer.
 */
export function enforceKairoResponse(
  reply: string,
  trace: ReasoningTrace,
  rules: KairoResponseEnforcementRules = {},
): KairoResponseEnforcementResult {
  const original = String(reply ?? '').trim();
  let text = original;
  const reasons: string[] = [];
  const disengaged = normalize(rules.conversationState) === 'disengaged';
  const continueConversation = rules.continueConversation !== false;
  const humorAllowed = rules.humorAllowed !== false;
  const askQuestion = rules.askQuestion !== false;
  const emojiLevel = Number.isFinite(rules.emojiLevel) ? Number(rules.emojiLevel) : 100;

  if (emojiLevel <= 0 && EMOJI_RE.test(text)) {
    EMOJI_RE.lastIndex = 0;
    text = text.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
    reasons.push('emoji_blocked');
  }
  EMOJI_RE.lastIndex = 0;

  if (!humorAllowed && HUMOR_MARKER_RE.test(text)) {
    HUMOR_MARKER_RE.lastIndex = 0;
    text = text.replace(HUMOR_MARKER_RE, '').replace(/\s{2,}/g, ' ').trim();
    reasons.push('humor_blocked');
  }
  HUMOR_MARKER_RE.lastIndex = 0;

  if (!askQuestion && text.includes('?')) {
    const withoutQuestions = removeQuestionSentences(text);
    text = withoutQuestions || fallbackForTrace(trace);
    reasons.push('question_blocked');
  }

  const hardClosed = disengaged || !continueConversation;
  if (hardClosed) {
    const violatesClosedConversation =
      text.length > 220 ||
      text.includes('?') ||
      HUMOR_MARKER_RE.test(text) ||
      AFFECTION_MARKER_RE.test(text) ||
      REOPEN_MARKER_RE.test(text);
    HUMOR_MARKER_RE.lastIndex = 0;
    if (violatesClosedConversation) {
      text = fallbackForTrace(trace);
      reasons.push('closed_conversation_enforced');
    }
  }

  if (!text.trim()) {
    text = fallbackForTrace(trace);
    reasons.push('empty_after_enforcement');
  }

  return {
    reply: text.trim(),
    changed: text.trim() !== original,
    reasons,
  };
}

/** Deterministic KDM post-generation consistency gate. */
export function validateKairoResponse(reply: string, trace: ReasoningTrace): ResponseConsistencyResult {
  const text = String(reply ?? '').trim();
  const lower = text.toLocaleLowerCase('tr-TR');
  const issues: string[] = [];

  const intent = normalize(trace?.messageInterpretation?.intent);
  const sentiment = normalize(trace?.messageInterpretation?.sentiment);
  const tone = normalize(trace?.decision?.chosenTone);
  const warmthScore = Number(trace?.relationship?.warmthScore ?? 50);
  const trustScore = Number(trace?.relationship?.trustScore ?? 50);
  const hurtScore = Number(trace?.relationship?.hurtScore ?? 0);
  const conflictScore = Number(trace?.relationship?.conflictScore ?? 0);
  const repairProgress = Number(trace?.relationship?.repairProgress ?? 0);
  const interactionCount = Number(trace?.relationship?.interactionCount ?? 0);

  const nonEmpty = text.length > 0;
  const length = text.length <= 12000;
  const traceCompleteness = Boolean(
    trace?.messageInterpretation?.intent &&
    trace?.messageInterpretation?.sentiment &&
    trace?.decision?.chosenTone &&
    trace?.currentMood?.moodText
  );

  if (!nonEmpty) issues.push('Boş yanıt');
  if (!length) issues.push('Aşırı uzun yanıt');
  if (!traceCompleteness) issues.push('Reasoning trace eksik');

  const emotionalContext = hasAny(`${intent} ${sentiment}`, [
    /(destek|duyg|stres|yorgun|üzgün|kayg|hassas)/,
  ]);
  const emotionalResponse = hasAny(lower, [
    /(anlıyorum|destek|sakin|yanınd|buraday|konuş|geçecek|zor|can sık|haklısın)/,
  ]);
  const warmTone = hasAny(tone, [/(sıcak|empatik|destek|şefkat|samimi|warm)/]);
  const warmResponse = hasAny(lower, [
    /(anlıyorum|buraday|yardım|destek|seni|yanınd|merak etme|birlikte|haklısın)/,
  ]);
  const firmTone = hasAny(tone, [/(kararlı|otoriter|sert|net|resmi|firm)/]);
  const firmResponse = hasAny(lower, [
    /(net|açıkça|gerekiyor|uyarı|kural|kontrol|uygulay|durdur|izin verilmez|yapılmalı|hoş değil|böyle konuş|sınır|devam etm)/,
  ]);
  const analyticalTone = hasAny(tone, [/(analitik|analiz|mantık|teknik|sistematik)/]);
  const analyticalResponse = hasAny(lower, [
    /(çünkü|neden|adım|sebep|analiz|veri|kontrol|sonuç|önce|ardından)/,
  ]);

  const intentTone = !emotionalContext || emotionalResponse;
  const sentimentTone = !warmTone || warmResponse || !emotionalContext;
  const decisionTone = (!firmTone || firmResponse) && (!analyticalTone || analyticalResponse);

  const unresolvedDamage = hurtScore >= 20 || conflictScore >= 20 || trustScore < 42 || warmthScore < 35;
  const playfulTone = hasAny(tone, [/(playful|şakacı|mizahi)/]);
  const overlyPlayfulReply = hasAny(lower, [/(😂|🤣|😏|lol|hahaha|final boss|maşallah.*damage|şaka maka)/]);
  const boundaryReply = hasAny(lower, [/(hoş değil|böyle konuş|sınır|istemiyorum|olmaz|şimdilik|erken|kalsın|devam etm|sakinleş)/]);
  const relationshipTone = !unresolvedDamage || ((!playfulTone || !overlyPlayfulReply) && (repairProgress >= 20 || !overlyPlayfulReply));

  const earlyRelationship = interactionCount <= 8 && trustScore <= 55 && warmthScore <= 55;
  const intimateReply = hasAny(lower, [
    /(boyn.{0,12}öp|öpüc|dudak|kucağ|kucağı|sıkı.{0,12}sarıl|kafanı.{0,16}omz|yatağ|tenin)/,
  ]);
  const intimacyBoundary = !earlyRelationship || !intimateReply || boundaryReply;

  if (!intentTone) issues.push('Duygusal destek niyetiyle yanıt yeterince destekleyici değil');
  if (!sentimentTone) issues.push('Seçilen sıcak/empatik ton yanıt metninde yeterince görünmüyor');
  if (!decisionTone) issues.push('Seçilen karar tonu yanıt metninde yeterince görünmüyor');
  if (!relationshipTone) issues.push('Yanıt çözülmemiş ilişki hasarına göre fazla şakacı/sıcak');
  if (!intimacyBoundary) issues.push('Yeni/düşük güvenli ilişkide fiziksel yakınlık sınırı fazla hızlı aşılıyor');

  const checks = [
    nonEmpty,
    length,
    intentTone,
    sentimentTone,
    decisionTone,
    relationshipTone,
    intimacyBoundary,
    traceCompleteness,
  ];
  const passedChecks = checks.filter(Boolean).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    accepted: issues.length === 0,
    score,
    issues,
    checks: {
      nonEmpty,
      length,
      intentTone,
      sentimentTone,
      decisionTone,
      relationshipTone,
      intimacyBoundary,
      traceCompleteness,
    },
  };
}
