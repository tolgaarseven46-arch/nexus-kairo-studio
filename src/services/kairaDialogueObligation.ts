import type { KairaResponsePlan } from "./kairaResponsePlan";

/**
 * Final-delivery obligation contract owned by the dialogue decision.
 *
 * This is intentionally NOT a generic response-quality judge. It only protects
 * obligations that would otherwise disappear during fallback/replacement.
 */

const ACK_ONLY_RE = /^(?:tamam(?:dır)?|peki|aynen|he+|hmm|anladım|ok(?:ey)?)[.!…]*$/iu;

export function findKairaDialogueObligationIssues(
  reply: string,
  plan: Pick<KairaResponsePlan, "move">,
): string[] {
  const text = String(reply ?? "").trim();
  if (plan.move === "answer_or_clarify" && ACK_ONLY_RE.test(text)) {
    return [
      "Aktif answer_or_clarify yükümlülüğü yalnız kabul/onay ifadesine çöktü; cevapla, açıkça ertele/reddet veya gerekli netleştirmeyi iste",
    ];
  }
  return [];
}

/**
 * Dialogue-owned last-resort outcome when a substantive answer candidate cannot
 * safely be delivered. It preserves the active move without fabricating facts.
 *
 * Other moves deliberately return null so their established fallback behavior
 * remains unchanged.
 */
export function buildKairaDialogueObligationFallback(
  plan: Pick<KairaResponsePlan, "move">,
): string | null {
  if (plan.move === "answer_or_clarify") {
    return "buna şu an net cevap veremem";
  }
  return null;
}
