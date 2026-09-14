import { describe, expect, it } from "vitest";
import type { SemanticModality } from "../types/semanticInterpretation";
import type { SocialAppraisalCommitmentContext } from "../types/socialAppraisal";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { assessCommitmentBetrayal } from "./socialAppraisalCommitmentBetrayal";

const priorCommitment: SocialAppraisalCommitmentContext = {
  kind: "commitment",
  state: "active",
  actorId: "user:ali",
  counterpartyId: "kaira",
  scopeKey: "promise:meet-kaira",
  confidence: 0.92,
  provenance: ["world_event:promise-1"],
};

function semantic(modality: SemanticModality) {
  return normalizeSemanticInterpretation({
    raw: "compound modality/appraisal characterization",
    propositions: [
      {
        id: `p-${modality}`,
        content: "Ali Kaira'ya verdiği sözü bozdu",
        actorId: "user:ali",
        addresseeId: "kaira",
        modality,
        confidence: 0.95,
        provenance: ["semantic:compound-characterization"],
      },
    ],
    attribution: {
      actorId: "user:ali",
      scopeKey: "promise:meet-kaira",
      intentionality: "intentional",
      commitmentViolation: "present",
      deception: "unknown",
      controllability: "high",
      communicationConsent: "absent",
      externalCause: "absent",
      confidence: 0.9,
      provenance: ["semantic:current-turn"],
    },
  });
}

describe("compound interaction characterization: proposition modality × betrayal appraisal", () => {
  it.each<SemanticModality>(["question", "hypothetical", "wish", "prediction"])(
    "does not materialize betrayal from a non-assertive %s proposition even when attribution carries violation evidence",
    (modality) => {
      const result = assessCommitmentBetrayal(semantic(modality), [priorCommitment]);

      expect(result.status).not.toBe("present");
      expect(result.confidence).toBe(0);
    },
  );

  it("preserves existing betrayal semantics for an assertive proposition", () => {
    const result = assessCommitmentBetrayal(semantic("assertion"), [priorCommitment]);

    expect(result.status).toBe("present");
    expect(result.confidence).toBeGreaterThan(0);
  });
});
