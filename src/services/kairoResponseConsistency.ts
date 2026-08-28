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

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR');
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
