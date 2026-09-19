export interface SliceBW2ReviewVerdicts {
  shadowSemanticAuthorityBlockerRemains: boolean;
  hiddenEngagementAuthorityBlockerRemains: boolean;
  isolationBlockerRemains: boolean;
  replayPurityBlockerRemains: boolean;
  determinismBlockerRemains: boolean;
  privacyBlockerRemains: boolean;
  safeToEnterW3AfterRepairs: boolean;
}

export interface SliceBW2ReviewIntake {
  reviewer: {
    name: string;
    independent: true;
    reviewedAt: string;
  };
  blockers: Array<{
    id: string;
    counterexample: string;
    violatedInvariant: string;
    minimumRepair: string;
    requiredTest: string;
  }>;
  nonBlockers: Array<{
    id: string;
    rationale: string;
    recommendedCleanupOrTest: string;
  }>;
  future: Array<{
    id: string;
    whyOutOfScope: string;
  }>;
  verdicts: SliceBW2ReviewVerdicts;
}

export interface SliceBW2TrustedReviewProvenance {
  source: "github_review" | "external_artifact";
  evidenceRef: string;
  reviewerIdentity: string;
  verifiedIndependent: true;
  verifiedBy: string;
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const validateSliceBW2ReviewIntake = (
  value: unknown,
): value is SliceBW2ReviewIntake => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SliceBW2ReviewIntake>;
  const reviewer = candidate.reviewer;
  const verdicts = candidate.verdicts as
    | Partial<SliceBW2ReviewVerdicts>
    | undefined;

  if (
    !reviewer ||
    !nonEmpty(reviewer.name) ||
    reviewer.independent !== true ||
    !nonEmpty(reviewer.reviewedAt)
  ) {
    return false;
  }

  const blockerOk =
    Array.isArray(candidate.blockers) &&
    candidate.blockers.every(
      (finding) =>
        nonEmpty(finding?.id) &&
        nonEmpty(finding?.counterexample) &&
        nonEmpty(finding?.violatedInvariant) &&
        nonEmpty(finding?.minimumRepair) &&
        nonEmpty(finding?.requiredTest),
    );

  const nonBlockerOk =
    Array.isArray(candidate.nonBlockers) &&
    candidate.nonBlockers.every(
      (finding) =>
        nonEmpty(finding?.id) &&
        nonEmpty(finding?.rationale) &&
        nonEmpty(finding?.recommendedCleanupOrTest),
    );

  const futureOk =
    Array.isArray(candidate.future) &&
    candidate.future.every(
      (finding) => nonEmpty(finding?.id) && nonEmpty(finding?.whyOutOfScope),
    );

  const verdictKeys: Array<keyof SliceBW2ReviewVerdicts> = [
    "shadowSemanticAuthorityBlockerRemains",
    "hiddenEngagementAuthorityBlockerRemains",
    "isolationBlockerRemains",
    "replayPurityBlockerRemains",
    "determinismBlockerRemains",
    "privacyBlockerRemains",
    "safeToEnterW3AfterRepairs",
  ];

  const verdictsOk =
    Boolean(verdicts) &&
    verdictKeys.every((key) => typeof verdicts?.[key] === "boolean");

  return blockerOk && nonBlockerOk && futureOk && verdictsOk;
};

export const validateSliceBW2TrustedReviewProvenance = (
  value: unknown,
): value is SliceBW2TrustedReviewProvenance => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SliceBW2TrustedReviewProvenance>;

  return (
    (candidate.source === "github_review" ||
      candidate.source === "external_artifact") &&
    nonEmpty(candidate.evidenceRef) &&
    nonEmpty(candidate.reviewerIdentity) &&
    candidate.verifiedIndependent === true &&
    nonEmpty(candidate.verifiedBy)
  );
};

export const canEnterSliceBW3 = (
  review: SliceBW2ReviewIntake,
  provenance?: SliceBW2TrustedReviewProvenance,
): boolean =>
  validateSliceBW2TrustedReviewProvenance(provenance) &&
  review.blockers.length === 0 &&
  Object.entries(review.verdicts)
    .filter(([key]) => key !== "safeToEnterW3AfterRepairs")
    .every(([, value]) => value === false) &&
  review.verdicts.safeToEnterW3AfterRepairs === true;
