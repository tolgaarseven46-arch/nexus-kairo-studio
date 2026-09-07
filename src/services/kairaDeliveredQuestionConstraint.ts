import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";

function responseUnits(text: string): string[] {
  return String(text ?? "")
    .trim()
    .split(/\n+|(?<=[.!?…;:])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Deterministic final-delivery enforcement for an already-owned plan decision.
 *
 * This does NOT decide whether a question is appropriate and does not parse user
 * semantics. KairaResponsePlan owns allowQuestion. We remove question units from
 * a multi-unit candidate when at least one non-question unit survives. Sentence
 * boundaries plus semicolon/colon clause boundaries are treated as removable
 * units so a valid social reaction is not lost merely because a forbidden
 * follow-up question shares the same orthographic sentence.
 *
 * If the whole candidate is a question, leave it untouched so normal
 * repair/fallback remains responsible instead of manufacturing a replacement.
 */
export function removeForbiddenQuestionUnits(
  reply: string,
  allowQuestion: boolean,
): string {
  const original = String(reply ?? "").trim();
  if (!original || allowQuestion) return original;

  const units = responseUnits(original);
  if (units.length < 2) return original;

  const kept = units.filter((unit) => !isTurkishQuestionAct(unit));
  if (kept.length === 0 || kept.length === units.length) return original;
  return kept.join("\n");
}
