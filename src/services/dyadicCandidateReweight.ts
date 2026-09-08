import type { SemanticInterpretation } from "../types/semanticInterpretation";
import {
  dyadicNormKeyForInterpretation,
  readDyadicNorm,
  type DyadicNormReading,
  type DyadicSocialNormProfile,
} from "./dyadicSocialNorm";
import type { SocialAppraisalCandidateReading } from "./socialAppraisalCandidateReadings";

export interface DyadicReweightedCandidateReading
  extends Omit<SocialAppraisalCandidateReading, "plausibility"> {
  /** Candidate plausibility before person-specific context. */
  basePlausibility: number;
  /** Bounded contextual plausibility after dyadic evidence. */
  plausibility: number;
  /** Signed bounded delta applied by the dyadic layer. */
  dyadicAdjustment: number;
}

export interface DyadicCandidateReweightResult {
  subjectMatched: boolean;
  dyadicApplied: boolean;
  normReading: DyadicNormReading | null;
  candidates: readonly DyadicReweightedCandidateReading[];
  reasons: readonly string[];
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const clampAdjustment = (value: number): number => Math.max(-0.35, Math.min(0.35, value));

function unchangedCandidate(
  candidate: Readonly<SocialAppraisalCandidateReading>,
): DyadicReweightedCandidateReading {
  return {
    ...candidate,
    basePlausibility: candidate.plausibility,
    plausibility: candidate.plausibility,
    dyadicAdjustment: 0,
  };
}

function adjustmentForCandidate(
  candidate: Readonly<SocialAppraisalCandidateReading>,
  norm: Readonly<DyadicNormReading>,
): number {
  if (candidate.kind === "literal_harm") {
    const harmfulPressure = norm.harmfulEvidence * 0.28;
    const benignDampen = norm.permissiveCandidate ? norm.benignEvidence * 0.2 : 0;
    return clampAdjustment(harmfulPressure - benignDampen);
  }

  if (candidate.kind === "playful_banter") {
    const benignLift = norm.permissiveCandidate ? norm.benignEvidence * 0.3 : 0;
    const harmfulDampen = norm.harmfulEvidence * 0.35;
    return clampAdjustment(benignLift - harmfulDampen);
  }

  return 0;
}

/**
 * Applies only established, same-subject dyadic evidence to contextual candidates.
 * It never mutates canonical semantics and never converts frequency alone into
 * permission. Harm evidence remains represented even in a permissive dyad.
 */
export function reweightSocialAppraisalCandidatesForDyad(
  semantic: Readonly<SemanticInterpretation>,
  candidates: readonly SocialAppraisalCandidateReading[],
  subjectId: string,
  profile: Readonly<DyadicSocialNormProfile>,
): DyadicCandidateReweightResult {
  if (profile.subjectId !== subjectId) {
    return {
      subjectMatched: false,
      dyadicApplied: false,
      normReading: null,
      candidates: candidates.map(unchangedCandidate),
      reasons: ["dyadic-subject-mismatch"],
    };
  }

  const key = dyadicNormKeyForInterpretation(semantic);
  if (!key) {
    return {
      subjectMatched: true,
      dyadicApplied: false,
      normReading: null,
      candidates: candidates.map(unchangedCandidate),
      reasons: ["no-dyadic-norm-key"],
    };
  }

  const norm = readDyadicNorm(profile, key);
  if (!norm.established) {
    return {
      subjectMatched: true,
      dyadicApplied: false,
      normReading: norm,
      candidates: candidates.map(unchangedCandidate),
      reasons: ["dyadic-norm-not-established"],
    };
  }

  const reweighted = candidates.map((candidate): DyadicReweightedCandidateReading => {
    const adjustment = adjustmentForCandidate(candidate, norm);
    const base = candidate.plausibility;
    const raw = clamp01(base + adjustment);

    // A learned benign pattern may dampen literal harm, but may never erase it.
    const harmFloor = candidate.kind === "literal_harm" ? Math.min(base, Math.max(0.2, base * 0.6)) : 0;
    const plausibility = candidate.kind === "literal_harm" ? Math.max(harmFloor, raw) : raw;

    return {
      ...candidate,
      basePlausibility: base,
      plausibility,
      dyadicAdjustment: plausibility - base,
    };
  });

  return {
    subjectMatched: true,
    dyadicApplied: true,
    normReading: norm,
    candidates: reweighted,
    reasons: [
      norm.permissiveCandidate
        ? "established-benign-dyadic-pattern"
        : "established-nonpermissive-dyadic-pattern",
    ],
  };
}
