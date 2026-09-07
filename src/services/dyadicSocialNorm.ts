import type { SemanticInterpretation, SemanticSocialAct } from "../types/semanticInterpretation";

export type DyadicNormKey =
  | "insult"
  | "mockery"
  | "compliment"
  | "support"
  | "affection"
  | "apology"
  | "rejection"
  | "coercion"
  | "manipulation"
  | "privacy_violation";

export type DyadicNormImpact = "benign" | "harmful" | "mixed" | "unknown";

export interface DyadicNormEvidence {
  observedCount: number;
  benignCount: number;
  harmfulCount: number;
  mixedCount: number;
  unknownCount: number;
  lastObservedAt?: string;
}

export interface DyadicSocialNormProfile {
  version: 0;
  subjectId: string;
  totalObservedTurns: number;
  evidence: Partial<Record<DyadicNormKey, DyadicNormEvidence>>;
}

export interface DyadicNormObservation {
  key: DyadicNormKey;
  impact: DyadicNormImpact;
  observedAt: string;
}

export interface DyadicNormReading {
  key: DyadicNormKey;
  observedCount: number;
  /** How familiar this event class is for this specific dyad. */
  expectedness: number;
  /** Evidence that previous instances were low-harm. Never inferred from frequency alone. */
  benignEvidence: number;
  /** Evidence that previous instances were harmful. */
  harmfulEvidence: number;
  /** True only after repeated evidence; a single turn can never establish a norm. */
  established: boolean;
  /** A frequent harmful pattern is familiar but explicitly not permissive. */
  permissiveCandidate: boolean;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function emptyDyadicSocialNorm(subjectId: string): DyadicSocialNormProfile {
  return {
    version: 0,
    subjectId,
    totalObservedTurns: 0,
    evidence: {},
  };
}

export function observeDyadicNorm(
  profile: Readonly<DyadicSocialNormProfile>,
  observation: Readonly<DyadicNormObservation>,
): DyadicSocialNormProfile {
  const previous = profile.evidence[observation.key] ?? {
    observedCount: 0,
    benignCount: 0,
    harmfulCount: 0,
    mixedCount: 0,
    unknownCount: 0,
  };

  const next: DyadicNormEvidence = {
    ...previous,
    observedCount: previous.observedCount + 1,
    benignCount: previous.benignCount + (observation.impact === "benign" ? 1 : 0),
    harmfulCount: previous.harmfulCount + (observation.impact === "harmful" ? 1 : 0),
    mixedCount: previous.mixedCount + (observation.impact === "mixed" ? 1 : 0),
    unknownCount: previous.unknownCount + (observation.impact === "unknown" ? 1 : 0),
    lastObservedAt: observation.observedAt,
  };

  return {
    ...profile,
    totalObservedTurns: profile.totalObservedTurns + 1,
    evidence: {
      ...profile.evidence,
      [observation.key]: next,
    },
  };
}

/**
 * Learned dyadic prior. Frequency affects expectedness, not moral/social permission.
 * Three observations are required before an event class is considered established.
 */
export function readDyadicNorm(
  profile: Readonly<DyadicSocialNormProfile>,
  key: DyadicNormKey,
): DyadicNormReading {
  const evidence = profile.evidence[key];
  if (!evidence) {
    return {
      key,
      observedCount: 0,
      expectedness: 0,
      benignEvidence: 0,
      harmfulEvidence: 0,
      established: false,
      permissiveCandidate: false,
    };
  }

  const observed = Math.max(0, evidence.observedCount);
  const expectedness = clamp01(1 - Math.exp(-observed / 4));
  const resolved = Math.max(1, evidence.benignCount + evidence.harmfulCount + evidence.mixedCount);
  const benignEvidence = clamp01((evidence.benignCount + evidence.mixedCount * 0.35) / resolved);
  const harmfulEvidence = clamp01((evidence.harmfulCount + evidence.mixedCount * 0.65) / resolved);
  const established = observed >= 3;

  return {
    key,
    observedCount: observed,
    expectedness,
    benignEvidence,
    harmfulEvidence,
    established,
    permissiveCandidate:
      established &&
      evidence.benignCount >= 2 &&
      benignEvidence >= 0.67 &&
      harmfulEvidence < 0.34,
  };
}

const SUPPORTED_ACTS: ReadonlySet<SemanticSocialAct> = new Set([
  "insult",
  "mockery",
  "compliment",
  "support",
  "affection",
  "apology",
  "rejection",
  "coercion",
  "manipulation",
  "privacy_violation",
]);

/**
 * Maps canonical semantic evidence to a norm key. No raw-text parsing is allowed.
 * Returns null when the current turn has no dyadic-norm-relevant social act.
 */
export function dyadicNormKeyForInterpretation(
  interpretation: Readonly<SemanticInterpretation>,
): DyadicNormKey | null {
  const ordered: SemanticSocialAct[] = [
    ...interpretation.secondarySocialActs,
    interpretation.primaryIntent as SemanticSocialAct,
  ];
  const found = ordered.find((act) => SUPPORTED_ACTS.has(act));
  return (found as DyadicNormKey | undefined) ?? null;
}
