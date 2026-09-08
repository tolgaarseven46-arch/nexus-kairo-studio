import type { SemanticInterpretation } from "../types/semanticInterpretation";

export type SocialAppraisalReadingKind =
  | "literal_harm"
  | "playful_banter"
  | "affiliative"
  | "repair"
  | "rejection"
  | "neutral_social";

export type SocialAppraisalReadingDirection =
  | "harmful"
  | "benign"
  | "repairing"
  | "neutral";

export type SocialAppraisalReadingEvidence =
  | "canonical_intent"
  | "canonical_social_act"
  | "canonical_severity"
  | "canonical_joking"
  | "canonical_sincerity"
  | "canonical_uncertainty"
  | "canonical_social_scalar";

export interface SocialAppraisalCandidateReading {
  /** Contextual hypothesis only. It is never a replacement semantic truth. */
  kind: SocialAppraisalReadingKind;
  direction: SocialAppraisalReadingDirection;
  /** 0..1 local plausibility. Candidate plausibilities are not probabilities and need not sum to 1. */
  plausibility: number;
  evidence: readonly SocialAppraisalReadingEvidence[];
  reasons: readonly string[];
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const maxSeverity = (semantic: Readonly<SemanticInterpretation>): number =>
  Math.max(
    semantic.severity.disrespect,
    semantic.severity.coercion,
    semantic.severity.manipulation,
    semantic.severity.privacy,
    semantic.severity.aggression,
  );

const hasAct = (semantic: Readonly<SemanticInterpretation>, act: string): boolean =>
  semantic.secondarySocialActs.some((candidate) => candidate === act);

function harmfulCandidate(
  semantic: Readonly<SemanticInterpretation>,
): SocialAppraisalCandidateReading | null {
  const explicitHarm =
    semantic.primaryIntent === "insult" ||
    hasAct(semantic, "insult") ||
    hasAct(semantic, "mockery") ||
    hasAct(semantic, "coercion") ||
    hasAct(semantic, "manipulation") ||
    hasAct(semantic, "privacy_violation") ||
    maxSeverity(semantic) > 0;
  if (!explicitHarm) return null;

  const severity = maxSeverity(semantic);
  const plausibility = clamp01(
    0.35 + severity * 0.4 + semantic.sincerityConfidence * 0.25 - semantic.jokingConfidence * 0.2,
  );
  return {
    kind: "literal_harm",
    direction: "harmful",
    plausibility,
    evidence: ["canonical_social_act", "canonical_severity", "canonical_sincerity"],
    reasons: ["canonical-harm-evidence"],
  };
}

function playfulCandidate(
  semantic: Readonly<SemanticInterpretation>,
): SocialAppraisalCandidateReading | null {
  const banterLike =
    semantic.primaryIntent === "banter" ||
    hasAct(semantic, "banter") ||
    hasAct(semantic, "mockery");
  const ambiguousHarm =
    semantic.primaryIntent === "insult" || hasAct(semantic, "insult") || hasAct(semantic, "mockery");
  const contextualAmbiguity =
    semantic.jokingConfidence >= 0.25 || semantic.uncertainty.overall >= 0.35;
  if (!banterLike && !(ambiguousHarm && contextualAmbiguity)) return null;

  const severity = maxSeverity(semantic);
  const plausibility = clamp01(
    0.2 + semantic.jokingConfidence * 0.5 + semantic.uncertainty.overall * 0.15 - severity * 0.2,
  );
  return {
    kind: "playful_banter",
    direction: "benign",
    plausibility,
    evidence: ["canonical_social_act", "canonical_joking", "canonical_uncertainty"],
    reasons: ["canonical-banter-or-ambiguous-mockery"],
  };
}

function positiveCandidate(
  semantic: Readonly<SemanticInterpretation>,
): SocialAppraisalCandidateReading | null {
  const positiveEvidence = Math.max(semantic.affection, semantic.support, semantic.compliment);
  if (
    semantic.primaryIntent !== "affection" &&
    semantic.primaryIntent !== "support" &&
    semantic.primaryIntent !== "compliment" &&
    positiveEvidence <= 0
  ) {
    return null;
  }
  return {
    kind: "affiliative",
    direction: "benign",
    plausibility: clamp01(0.45 + positiveEvidence * 0.5),
    evidence: ["canonical_intent", "canonical_social_scalar"],
    reasons: ["canonical-affiliative-evidence"],
  };
}

function repairCandidate(
  semantic: Readonly<SemanticInterpretation>,
): SocialAppraisalCandidateReading | null {
  if (
    semantic.primaryIntent !== "apology" &&
    semantic.primaryIntent !== "repair" &&
    !semantic.apology &&
    !semantic.repairAttempt &&
    !hasAct(semantic, "apology") &&
    !hasAct(semantic, "repair")
  ) {
    return null;
  }
  return {
    kind: "repair",
    direction: "repairing",
    plausibility: clamp01(0.45 + semantic.sincerityConfidence * 0.45),
    evidence: ["canonical_intent", "canonical_social_act", "canonical_sincerity"],
    reasons: ["canonical-repair-evidence"],
  };
}

function rejectionCandidate(
  semantic: Readonly<SemanticInterpretation>,
): SocialAppraisalCandidateReading | null {
  if (semantic.primaryIntent !== "rejection") return null;
  return {
    kind: "rejection",
    direction: "harmful",
    plausibility: clamp01(0.5 + semantic.sincerityConfidence * 0.4),
    evidence: ["canonical_intent", "canonical_sincerity"],
    reasons: ["canonical-rejection-evidence"],
  };
}

/**
 * Produces contextual hypotheses from the immutable canonical interpretation.
 * It does not select a winner, mutate semantics, inspect raw text, or update
 * relationship/affect state. Dyadic priors are deliberately deferred to G2.
 */
export function generateSocialAppraisalCandidateReadings(
  semantic: Readonly<SemanticInterpretation>,
): readonly SocialAppraisalCandidateReading[] {
  const candidates = [
    harmfulCandidate(semantic),
    playfulCandidate(semantic),
    positiveCandidate(semantic),
    repairCandidate(semantic),
    rejectionCandidate(semantic),
  ].filter((candidate): candidate is SocialAppraisalCandidateReading => candidate !== null);

  if (candidates.length > 0) return candidates;

  return [{
    kind: "neutral_social",
    direction: "neutral",
    plausibility: clamp01(1 - semantic.uncertainty.overall * 0.5),
    evidence: ["canonical_uncertainty"],
    reasons: ["no-material-contextual-reading"],
  }];
}
