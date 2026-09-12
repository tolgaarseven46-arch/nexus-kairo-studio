import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type {
  SocialAppraisalCommitmentContext,
  SocialAppraisalEvidenceAssessment,
  SocialAppraisalResult,
} from "../types/socialAppraisal";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const absent = (reason: string): SocialAppraisalEvidenceAssessment => ({
  status: "absent",
  confidence: 0,
  reasons: [reason],
});

const unknown = (reason: string): SocialAppraisalEvidenceAssessment => ({
  status: "unknown",
  confidence: 0,
  reasons: [reason],
});

function activeMatchingCommitment(
  semantic: Readonly<SemanticInterpretation>,
  commitments: readonly Readonly<SocialAppraisalCommitmentContext>[],
): Readonly<SocialAppraisalCommitmentContext> | undefined {
  const attribution = semantic.attribution;
  if (!attribution?.actorId || !attribution.scopeKey) return undefined;
  return commitments.find((commitment) =>
    commitment.kind === "commitment" &&
    commitment.state === "active" &&
    commitment.actorId === attribution.actorId &&
    commitment.scopeKey === attribution.scopeKey &&
    (!commitment.counterpartyId || commitment.counterpartyId === "kaira"),
  );
}

export function assessCommitmentBetrayal(
  semantic: Readonly<SemanticInterpretation>,
  commitments: readonly Readonly<SocialAppraisalCommitmentContext>[] = [],
): SocialAppraisalEvidenceAssessment {
  const attribution = semantic.attribution;

  if (attribution?.commitmentViolation === "absent") {
    return absent("betrayal:no-current-violation");
  }
  if (attribution?.commitmentViolation !== "present") {
    return unknown("betrayal:current-violation-unknown");
  }
  if (!attribution.actorId || !attribution.scopeKey) {
    return unknown("betrayal:attribution-scope-or-actor-missing");
  }

  const anyActiveCommitment = commitments.some((commitment) => commitment.state === "active");
  if (!anyActiveCommitment) return absent("betrayal:no-active-prior-commitment");

  const sameActor = commitments.some((commitment) =>
    commitment.state === "active" && commitment.actorId === attribution.actorId,
  );
  if (!sameActor) return absent("betrayal:party-mismatch");

  const sameScope = commitments.some((commitment) =>
    commitment.state === "active" &&
    commitment.actorId === attribution.actorId &&
    commitment.scopeKey === attribution.scopeKey,
  );
  if (!sameScope) return absent("betrayal:scope-mismatch");

  const commitment = activeMatchingCommitment(semantic, commitments);
  if (!commitment) return absent("betrayal:counterparty-mismatch");

  if (attribution.intentionality === "unknown" || attribution.provenance.length === 0) {
    return unknown("betrayal:intentionality-evidence-missing");
  }
  if (attribution.intentionality !== "intentional") {
    return absent("betrayal:violation-not-intentional");
  }
  if (commitment.provenance.length === 0 || commitment.confidence <= 0 || attribution.confidence <= 0) {
    return unknown("betrayal:confidence-or-provenance-missing");
  }

  return {
    status: "present",
    confidence: clamp01(Math.min(commitment.confidence, attribution.confidence)),
    reasons: [
      "betrayal:active-prior-commitment",
      "betrayal:same-party",
      "betrayal:same-scope",
      "betrayal:intentional-violation",
    ],
  };
}

/**
 * Unfairness needs comparative allocation/treatment evidence or an explicit norm
 * violation. Commitment evidence alone is not enough, so the first contract is
 * deliberately fail-closed.
 */
export function assessUnfairness(): SocialAppraisalEvidenceAssessment {
  return unknown("unfairness:comparative-or-norm-evidence-missing");
}

export function applyCommitmentAppraisalEvidence(
  base: Readonly<SocialAppraisalResult>,
  semantic: Readonly<SemanticInterpretation>,
  commitments: readonly Readonly<SocialAppraisalCommitmentContext>[] = [],
): SocialAppraisalResult {
  const betrayal = assessCommitmentBetrayal(semantic, commitments);
  const unfairness = assessUnfairness();
  if (betrayal.status !== "present") {
    return {
      ...base,
      betrayal,
      unfairness,
      reasons: [...base.reasons, ...betrayal.reasons, ...unfairness.reasons],
    };
  }

  // Betrayal is a typed appraisal construct. It may create relational injury from
  // exact-zero lexical severity because the material evidence is cross-turn:
  // prior active commitment + same party/scope + canonical intentional violation.
  const betrayalPressure = clamp01(betrayal.confidence * 0.85);
  const harmEvidence = Math.max(base.relational.harmEvidence, betrayalPressure);
  const significance = Math.max(base.relational.significance, harmEvidence);
  return {
    ...base,
    confidence: Math.max(base.confidence, betrayal.confidence),
    betrayal,
    unfairness,
    relational: {
      ...base.relational,
      valence: "negative",
      significance,
      harmEvidence,
    },
    affective: {
      ...base.affective,
      valence: base.affective.valence === "positive" ? "neutral" : "negative",
      significance: Math.max(base.affective.significance, betrayalPressure * 0.65),
      activation: Math.max(base.affective.activation, betrayalPressure * 0.55),
    },
    noMaterialEffect: false,
    reasons: [...base.reasons, ...betrayal.reasons, ...unfairness.reasons],
  };
}
