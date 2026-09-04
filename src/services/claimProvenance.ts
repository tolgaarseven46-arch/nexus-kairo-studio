export type ClaimStatus = "asserted" | "uncertain" | "absurd" | "denial";

/**
 * Canonical conversational proposition provenance.
 *
 * A Claim records who asserted what about whom. It is not itself world truth.
 * Oppositions are append-only rows; prior claims are never rewritten.
 */
export interface Claim {
  id: string;
  source: string;
  subject: string;
  proposition: string;
  confidence: number;
  status: ClaimStatus;
  opposesClaimId?: string;
  derivedWorldEventId?: string;
}

/** Compatibility name while dialogue consumers migrate to the canonical contract. */
export type DialogueClaim = Claim;

export function claimOppositions(claim: Claim, ledger: Claim[]): Claim[] {
  return ledger.filter(
    (candidate) => candidate.status === "denial" && candidate.opposesClaimId === claim.id,
  );
}

export function isClaimEffectivelySupported(claim: Claim, ledger: Claim[]): boolean {
  if (claim.status !== "asserted" && claim.status !== "uncertain") return false;
  return claimOppositions(claim, ledger).length === 0;
}

export function effectivelySupportedClaims(ledger: Claim[]): Claim[] {
  return ledger.filter((claim) => isClaimEffectivelySupported(claim, ledger));
}

/**
 * Claim → WorldEvent is deliberately explicit. No report/denial is promoted merely
 * because it was said with confidence. A future verifier may set derivedWorldEventId.
 */
export function claimHasWorldEventDerivation(claim: Claim): boolean {
  return Boolean(claim.derivedWorldEventId);
}
