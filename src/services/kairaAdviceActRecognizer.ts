const EXPLICIT_ADVICE_RE =
  /\b(?:bence\s+)?(?:erken\s+yat|biraz\s+dinlen|dinlensen\s+iyi\s+olur|uyusan\s+iyi\s+olur|şunu\s+yap|bunu\s+yap|yapmalısın|yapmalisin|etmelisin|denemelisin|gitmelisin|kalmalısın|kalmalisin|iyi\s+gelir|faydalı\s+olur|mantıklı\s+olur)\b/iu;
const ADVICE_SUFFIX_RE = /\b[\p{L}]+(?:malısın|melisin|malisin)\b/iu;

/**
 * Structural delivered-text recognizer only. It does not decide whether advice
 * is appropriate; KairaResponsePlan owns that permission. This recognizer only
 * detects clear advice/ought surfaces so final delivery can enforce the plan.
 */
export function isTurkishAdviceAct(text: string): boolean {
  const normalized = String(text ?? "").trim();
  if (!normalized) return false;
  return EXPLICIT_ADVICE_RE.test(normalized) || ADVICE_SUFFIX_RE.test(normalized);
}
