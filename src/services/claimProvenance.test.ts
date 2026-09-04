import { describe, expect, it } from "vitest";
import {
  type Claim,
  claimHasWorldEventDerivation,
  isClaimEffectivelySupported,
} from "./claimProvenance";

describe("canonical Claim provenance", () => {
  it("keeps the original assertion immutable while a denial opposes it", () => {
    const asserted: Claim = {
      id: "claim-1",
      source: "Mert",
      subject: "Emre",
      proposition: "Emre yarın işi bırakacak",
      confidence: 0.7,
      status: "asserted",
    };
    const denial: Claim = {
      id: "claim-2",
      source: "Ali",
      subject: "Emre",
      proposition: "Emre yarın işi bırakacak",
      confidence: 0.8,
      status: "denial",
      opposesClaimId: asserted.id,
    };
    const ledger = [asserted, denial];

    expect(asserted.status).toBe("asserted");
    expect(denial.opposesClaimId).toBe(asserted.id);
    expect(isClaimEffectivelySupported(asserted, ledger)).toBe(false);
    expect(isClaimEffectivelySupported(denial, ledger)).toBe(false);
  });

  it("does not confuse conversational assertion with derived world truth", () => {
    const claim: Claim = {
      id: "claim-report",
      source: "Mert",
      subject: "Emre",
      proposition: "Emre yarın işi bırakacak",
      confidence: 0.9,
      status: "asserted",
    };
    expect(claimHasWorldEventDerivation(claim)).toBe(false);
  });
});
