import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";

function responseUnits(text: string): string[] {
  return String(text ?? "")
    .trim()
    .split(/\n+|(?<=[.!?…])\s+|\s*;\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function canonicalReplyIsQuestion(
  interpretation?: SemanticInterpretation | null,
): boolean {
  if (!interpretation) return false;
  return interpretation.primaryIntent === "question" || interpretation.primaryIntent === "information_request";
}

/**
 * Canonical reply semantics may prove that a mixed candidate performs a question
 * even when the structural fast-path cannot recognize informal Turkish such as
 * `ne tarz açıyosun şimdi`. In that case this helper does not decide WHETHER the
 * reply is a question; canonical semantics already owns that decision. It only
 * locates a trailing interrogative-looking clause so the preceding allowed
 * reaction can survive instead of dropping the whole candidate.
 */
function salvageLeadingNonQuestionClause(
  original: string,
  interpretation?: SemanticInterpretation | null,
): string | null {
  if (!canonicalReplyIsQuestion(interpretation)) return null;
  const match = original.match(
    /^(.*?)[,;:]\s*((?:ne|neden|niye|nas[ıi]l|kim|hangi|nerede|neresi|nereye|nereden|kaç)\b.+)$/iu,
  );
  if (!match) return null;
  const leading = String(match[1] ?? "").trim();
  const trailing = String(match[2] ?? "").trim();
  if (!leading || !trailing) return null;
  return leading;
}

/**
 * Deterministic final-delivery enforcement for an already-owned plan decision.
 *
 * This does NOT decide whether a question is appropriate and does not parse user
 * semantics. KairaResponsePlan owns allowQuestion. The structural recognizer is
 * the fast path; when canonical generated-reply semantics is available it may
 * also prove that a mixed candidate performs a question. We then preserve only
 * an independently non-question reaction clause. If the whole candidate is a
 * question, leave it untouched so normal repair/fallback remains responsible.
 */
export function removeForbiddenQuestionUnits(
  reply: string,
  allowQuestion: boolean,
  replySemanticInterpretation?: SemanticInterpretation | null,
): string {
  const original = String(reply ?? "").trim();
  if (!original || allowQuestion) return original;

  const units = responseUnits(original);
  if (units.length >= 2) {
    const kept = units.filter((unit) => !isTurkishQuestionAct(unit));
    if (kept.length > 0 && kept.length < units.length) return kept.join("\n");
  }

  return salvageLeadingNonQuestionClause(original, replySemanticInterpretation) ?? original;
}
