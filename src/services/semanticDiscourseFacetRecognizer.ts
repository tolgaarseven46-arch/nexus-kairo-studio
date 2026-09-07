/**
 * Deterministic ingestion-time recognizer for discourse-facing utterance facets.
 *
 * This is part of the canonical language-understanding boundary. Downstream
 * discourse consumers must read the resulting SemanticInterpretation fields and
 * must never re-run these recognizers against raw user text.
 */

export interface CanonicalDiscourseSignalReading {
  signalsAlreadyAnswered: boolean;
  answerFriction: boolean;
  stateAnswerShape: boolean;
  shortUtteranceShape: boolean;
  activityAnswerShape: boolean;
}

const ALREADY_ANSWERED_RE =
  /\b(dedim\s*ya|söyledim\s*ya|zaten\s+(?:dedim|söyledim|s[öo]yl[üu]yorum)|dedim\s+sana|geçen\s+de\s+dedim)\b/iu;

const PRIOR_ANSWER_FRICTION_RE =
  /\b(?:az\s+önce|daha\s+demin|demin|zaten|kaç\s+kere)\b.{0,48}\b(?:dedim|söyledim|s[öo]yledim|cevap\s+verdim|söyleyeyim|s[öo]yleyeyim)\b|\b(?:dedim|söyledim|s[öo]yledim|cevap\s+verdim)\b.{0,32}\b(?:az\s+önce|daha\s+demin|demin|zaten|sana)\b|\bkaç\s+kere\b/iu;

const STATE_ANSWER_PREFIX_RE =
  /^(?:iyi(?:yim|dir)?|k[öo]t[üu](?:y[üu]m)?|fena\s+değil|eh\b|idare\b|normal\b|ayn[ıi]\b|moral(?:im)?\b|mod(?:um)?\b)/iu;

const ACTIVITY_ANSWER_PREFIX_RE =
  /^(?:tak[ıi]l|çalış|çal[ıi][şs]|otur|evde|işte|okulda|dışarı|boş|hiçbir|bi\s+şey|bir\s+şey)/iu;

export function recognizeCanonicalDiscourseSignals(message: string): CanonicalDiscourseSignalReading {
  const text = String(message ?? "").trim().toLocaleLowerCase("tr-TR");
  const wordCount = (text.match(/\S+/gu) ?? []).length;
  return {
    signalsAlreadyAnswered: ALREADY_ANSWERED_RE.test(text),
    answerFriction: PRIOR_ANSWER_FRICTION_RE.test(text),
    stateAnswerShape: STATE_ANSWER_PREFIX_RE.test(text),
    shortUtteranceShape: text.length > 0 && wordCount <= 4,
    activityAnswerShape: ACTIVITY_ANSWER_PREFIX_RE.test(text),
  };
}
