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
    /(yardım|anlıyorum|destek|sakin|nefes|yanınd|buraday|konuş|geçecek)/,
  ]);
  const warmTone = hasAny(tone, [/(sıcak|empatik|destek|şefkat|samimi)/]);
  const warmResponse = hasAny(lower, [
    /(anlıyorum|buraday|yardım|destek|seni|yanınd|merak etme|birlikte)/,
  ]);
  const firmTone = hasAny(tone, [/(kararlı|otoriter|sert|net|resmi|firm)/]);
  const firmResponse = hasAny(lower, [
    /(net|açıkça|gerekiyor|uyarı|kural|kontrol|uygulay|durdur|izin verilmez|yapılmalı)/,
  ]);
  const analyticalTone = hasAny(tone, [/(analitik|analiz|mantık|teknik|sistematik)/]);
  const analyticalResponse = hasAny(lower, [
    /(çünkü|neden|adım|sebep|analiz|veri|kontrol|sonuç|önce|ardından)/,
  ]);

  const intentTone = !emotionalContext || emotionalResponse;
  const sentimentTone = !warmTone || warmResponse || !emotionalContext;
  const decisionTone = (!firmTone || firmResponse) && (!analyticalTone || analyticalResponse);

  if (!intentTone) issues.push('Duygusal destek niyetiyle yanıt yeterince destekleyici değil');
  if (!sentimentTone) issues.push('Seçilen sıcak/empatik ton yanıt metninde yeterince görünmüyor');
  if (!decisionTone) issues.push('Seçilen karar tonu yanıt metninde yeterince görünmüyor');

  const passedChecks = [nonEmpty, length, intentTone, sentimentTone, decisionTone, traceCompleteness]
    .filter(Boolean).length;
  const score = Math.round((passedChecks / 6) * 100);

  return {
    accepted: issues.length === 0,
    score,
    issues,
    checks: { nonEmpty, length, intentTone, sentimentTone, decisionTone, traceCompleteness },
  };
}
