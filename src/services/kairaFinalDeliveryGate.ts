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

export function resolveKairaFinalDelivery(
  candidateReply: string,
  consistency: KairaFinalConsistencySnapshot,
): KairaFinalDeliveryDecision {
  const accepted = consistency.accepted === true;
  return {
    accepted,
    candidateReply,
    persistedReply: accepted ? candidateReply : "",
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
