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

const attribution = {
  actorId: "user:ali",
  scopeKey: "promise:meet-kaira",
  intentionality: "intentional" as const,
  commitmentViolation: "present" as const,
  deception: "unknown" as const,
  controllability: "high" as const,
  communicationConsent: "absent" as const,
  externalCause: "absent" as const,
  confidence: 0.9,
  provenance: ["semantic:current-turn"],
};

function proposition(modality: SemanticModality, id = `p-${modality}`) {
  return {
    id,
    content: "Ali Kaira'ya verdiği sözü bozdu",
    actorId: "user:ali",
    addresseeId: "kaira",
    modality,
    confidence: 0.95,
    provenance: ["semantic:compound-characterization"],
  };
}

function semantic(modality: SemanticModality) {
  return normalizeSemanticInterpretation({
    raw: "compound modality/appraisal characterization",
    propositions: [proposition(modality)],
    attribution,
  });
}

describe("compound interaction characterization: proposition modality × betrayal appraisal", () => {
  it.each<SemanticModality>(["question", "hypothetical", "wish", "prediction"])(
    "fails closed for a non-assertive %s proposition even when attribution carries violation evidence",
    (modality) => {
      const result = assessCommitmentBetrayal(semantic(modality), [priorCommitment]);

      expect(result.status).toBe("unknown");
      expect(result.confidence).toBe(0);
      expect(result.reasons).toContain("betrayal:current-violation-non-assertive");
    },
  );

  it("preserves existing betrayal semantics for an assertive proposition", () => {
    const result = assessCommitmentBetrayal(semantic("assertion"), [priorCommitment]);

    expect(result.status).toBe("present");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("preserves legacy compatibility when proposition evidence is absent", () => {
    const legacy = normalizeSemanticInterpretation({
      raw: "legacy semantic without proposition evidence",
      attribution,
    });

    const result = assessCommitmentBetrayal(legacy, [priorCommitment]);

    expect(result.status).toBe("present");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("does not suppress valid betrayal when mixed proposition evidence includes an assertion", () => {
    const mixed = normalizeSemanticInterpretation({
      raw: "mixed proposition evidence",
      propositions: [
        proposition("wish", "p-wish"),
        proposition("assertion", "p-assertion"),
      ],
      attribution,
    });

    const result = assessCommitmentBetrayal(mixed, [priorCommitment]);

    expect(result.status).toBe("present");
    expect(result.confidence).toBeGreaterThan(0);
  });
});
