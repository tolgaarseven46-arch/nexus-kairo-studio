export interface KairaFinalConsistencySnapshot {
  accepted: boolean;
  score: number;
  issues: string[];
}

export interface KairaFinalDeliveryDecision {
  accepted: boolean;
  candidateReply: string;
  persistedReply: string;
  score: number;
  issues: string[];
}

/**
 * Operational last-resort surface for a rejected candidate.
 *
 * This does not turn a rejected candidate into an accepted one and does not
 * invent domain/world/relationship content. It exists solely to uphold the
 * delivery invariant that a completed chat turn must never persist an empty
 * assistant message. Normal constraint repair/fallback remains the preferred
 * path and this text is used only after that path has failed closed.
 */
export const KAIRA_FINAL_REJECTION_FALLBACK = "bunu şu an düzgün cevaplayamadım";

export function resolveKairaFinalDelivery(
  candidateReply: string,
  consistency: KairaFinalConsistencySnapshot,
): KairaFinalDeliveryDecision {
  const accepted = consistency.accepted === true;
  const candidate = String(candidateReply ?? "").trim();
  return {
    accepted,
    candidateReply: candidate,
    persistedReply: accepted ? candidate : KAIRA_FINAL_REJECTION_FALLBACK,
    score: consistency.score,
    issues: [...consistency.issues],
  };
}

export function buildKairaFinalDeliveryRejectionError(
  decision: KairaFinalDeliveryDecision,
): Error {
  const issueText = decision.issues.length ? decision.issues.join("; ") : "unknown_final_delivery_issue";
  const error = new Error(`final_delivery_rejected: ${issueText}`);
  error.name = "KairaFinalDeliveryRejectedError";
  return error;
}
