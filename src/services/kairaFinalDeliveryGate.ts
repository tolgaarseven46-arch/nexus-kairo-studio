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
  recoveryUsed: boolean;
}

/**
 * Last-resort availability surface for a candidate that exhausted canonical
 * repair/fallback and still failed final delivery. It deliberately carries no
 * world fact, advice, affection, question, promise, or relational claim.
 *
 * `accepted` remains false, so this line is never learned as a successful
 * language response and the original issues stay observable in KNT/metrics.
 */
export const KAIRA_FINAL_DELIVERY_RECOVERY_REPLY = "bi saniye, bunu toparlayamadım";

export function resolveKairaFinalDelivery(
  candidateReply: string,
  consistency: KairaFinalConsistencySnapshot,
): KairaFinalDeliveryDecision {
  const accepted = consistency.accepted === true;
  const normalizedCandidate = String(candidateReply ?? "").trim();
  const persistedReply = accepted
    ? normalizedCandidate
    : KAIRA_FINAL_DELIVERY_RECOVERY_REPLY;
  return {
    accepted,
    candidateReply: normalizedCandidate,
    persistedReply,
    score: consistency.score,
    issues: [...consistency.issues],
    recoveryUsed: !accepted,
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
