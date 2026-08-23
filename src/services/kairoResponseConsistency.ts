import type { ReasoningTrace } from '../types/nexus';

export interface ResponseConsistencyResult {
  accepted: boolean;
  score: number;
  issues: string[];
}

export function validateKairoResponse(reply: string, trace: ReasoningTrace): ResponseConsistencyResult {
  const text = (reply || '').trim();
  const issues: string[] = [];
  if (!text) issues.push('Boş yanıt');
  if (text.length > 12000) issues.push('Aşırı uzun yanıt');

  const intent = String(trace.messageInterpretation?.intent || '').toLocaleLowerCase('tr-TR');
  const sentiment = String(trace.messageInterpretation?.sentiment || '').toLocaleLowerCase('tr-TR');
  const tone = String(trace.decision?.chosenTone || '').toLocaleLowerCase('tr-TR');
  const lower = text.toLocaleLowerCase('tr-TR');

  if (/(destek|duyg|stres|yorgun|üzgün|kayg)/.test(intent + sentiment) && !/(yardım|anlıyorum|destek|sakin|nefes|yanınd|buraday|konuş)/.test(lower)) {
    issues.push('Duygusal destek niyetiyle yanıt tonu yeterince uyumlu değil');
  }
  if (/(sıcak|empatik|destek)/.test(tone) && !/(anlıyorum|buraday|yardım|destek|seni)/.test(lower)) {
    issues.push('Seçilen sıcak/empatik ton yanıt metninde yeterince görünmüyor');
  }

  const score = Math.max(0, Math.round(100 - issues.length * 25));
  return { accepted: issues.length === 0, score, issues };
}
