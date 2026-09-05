const QUESTION_PUNCTUATION_RE = /[?？]/u;
const QUESTION_CLITIC_RE =
  /(?<![\p{L}\p{N}_])(?:m[ıiuü]|misin|m[ıi]s[ıi]n|musun|m[üu]s[üu]n|m[ıi]y[ıi]m|muyum|m[üu]y[üu]m|m[ıi]yd[ıi]|m[ıi]yd[ıi]n|m[ıi]yd[ıi]k|m[ıi]yd[ıi]lar)(?![\p{L}\p{N}_])/iu;

const DIRECT_INTERROGATIVE_START_RE =
  /^\s*(?:neden|niye|nas[ıi]l|kim|kimle|kimin|kimden|kimde|kime|kimi|hangi|hangisi|hangileri|nerede|neresi|nereye|nereden|kaç)(?![\p{L}\p{N}_])/iu;

const EMBEDDED_INTERROGATIVE_RE =
  /(?:[,.!…;:]\s*|(?<![\p{L}\p{N}_])(?:peki|tamam|güzel|iyi|ee|e|hmm|hımm|ya)\s+)(?:neden|niye|nas[ıi]l|kim|kimle|kimin|kimden|kimde|kime|kimi|hangi|hangisi|hangileri|nerede|neresi|nereye|nereden|kaç)(?![\p{L}\p{N}_])/iu;

const CASE_MARKED_INTERROGATIVE_RE =
  /(?<![\p{L}\p{N}_])(?:kimle|kimin|kimden|kimde|kime|kimi|nerede|neresi|nereye|nereden|hangisi|hangileri|neden|niye)(?![\p{L}\p{N}_])/iu;

const DIRECT_SOCIAL_QUESTION_RE =
  /(?<![\p{L}\p{N}_])(?:nas[ıi]ls[ıi]n|senden\s+naber|sen\s+naber|ne\s+yap[ıi]yorsun|nap[ıi]yorsun|nap[ıi]yon|iyi\s+misin)(?![\p{L}\p{N}_])/iu;

const INTERROGATIVE_PREDICATE_RE =
  /(?<![\p{L}\p{N}_])(?:ne\s+durumda|neyden(?:\s+bu\s+kadar)?|neye\s+göre|neyi\s+kast(?:ediyorsun|ettin)|ne\s+oldu|ne\s+oluyor|ne\s+olacak|ne\s+zaman|ne\s+kadar\s+(?:sürüyor|sürecek|var))(?![\p{L}\p{N}_])/iu;

const SUBJECT_NE_NOW_RE =
  /(?<![\p{L}\p{N}_])[\p{L}\p{N}_-]+\s+ne(?:\s+(?:şu\s+an|şimdi))?\s*[.!…]*\s*$/iu;

const REPORTED_DIRECT_QUESTION_RE =
  /(?<![\p{L}\p{N}_])(?:neden|niye|nas[ıi]l|kim(?:le|in|den|de|e|i)?|hangi(?:si|leri)?|nerede|neresi|nereye|nereden|kaç|ne(?:\s+(?:durumda|oldu|oluyor|olacak|zaman|kadar))?)(?![\p{L}\p{N}_]).{0,60}(?<![\p{L}\p{N}_])(?:diye\s+(?:sordu|dedi|anlatt[ıi]|söyledi)|sorduğunu|dediğini|anlattığını|söylediğini)(?![\p{L}\p{N}_])/iu;

const REPORTED_INDIRECT_QUESTION_RE =
  /(?<![\p{L}\p{N}_])(?:kim(?:le|in|den|de|e|i)?|hangi(?:si|leri)?|nerede|nereye|nereden|neden|niye|nas[ıi]l|ne)(?![\p{L}\p{N}_]).{0,50}(?<![\p{L}\p{N}_])(?:olduğunu|olacağını|yaptığını|oynadığını|dediğini|istediğini|gittiğini|geldiğini)(?![\p{L}\p{N}_]).{0,30}(?<![\p{L}\p{N}_])(?:anlatt[ıi]|söyledi|dedi|biliyorum|biliyorsun|öğrendim)(?![\p{L}\p{N}_])/iu;

/**
 * Structural recognizer for whether generated Turkish text performs a question act.
 *
 * This module does not decide whether Kaira MAY ask a question. That WHAT/WHETHER
 * decision belongs exclusively to ResponsePlan. It only measures the realized
 * output so the final contract boundary can validate plan conformance.
 */
export function isTurkishQuestionAct(text: string): boolean {
  const value = String(text ?? "").trim();
  if (!value) return false;
  if (QUESTION_PUNCTUATION_RE.test(value)) return true;
  if (REPORTED_DIRECT_QUESTION_RE.test(value) || REPORTED_INDIRECT_QUESTION_RE.test(value)) return false;

  return (
    QUESTION_CLITIC_RE.test(value) ||
    DIRECT_INTERROGATIVE_START_RE.test(value) ||
    EMBEDDED_INTERROGATIVE_RE.test(value) ||
    CASE_MARKED_INTERROGATIVE_RE.test(value) ||
    DIRECT_SOCIAL_QUESTION_RE.test(value) ||
    INTERROGATIVE_PREDICATE_RE.test(value) ||
    SUBJECT_NE_NOW_RE.test(value)
  );
}
