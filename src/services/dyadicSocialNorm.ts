import type { SemanticInterpretation, SemanticSocialAct } from "../types/semanticInterpretation";
import type {
  DyadicNormEvidence,
  DyadicNormKey,
  DyadicNormObservation,
  DyadicNormReading,
  DyadicSocialNormProfile,
} from "../types/dyadicSocialNorm";

export type {
  DyadicNormEvidence,
  DyadicNormImpact,
  DyadicNormKey,
  DyadicNormObservation,
  DyadicNormReading,
  DyadicSocialNormProfile,
} from "../types/dyadicSocialNorm";

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

const SECONDARY_NORM_KEYS: ReadonlySet<SemanticSocialAct> = new Set([
  "insult",
  "mockery",
  "affection",
  "apology",
  "coercion",
  "manipulation",
  "privacy_violation",
]);

/**
 * Maps canonical semantic evidence to a norm key. No raw-text parsing is allowed.
 * Primary intent and secondary social acts retain their canonical distinction.
 */
export function dyadicNormKeyForInterpretation(
  interpretation: Readonly<SemanticInterpretation>,
): DyadicNormKey | null {
  const secondary = interpretation.secondarySocialActs.find((act) =>
    SECONDARY_NORM_KEYS.has(act),
  );
  if (secondary) return secondary as DyadicNormKey;

  switch (interpretation.primaryIntent) {
    case "insult":
    case "compliment":
    case "support":
    case "affection":
    case "apology":
    case "rejection":
      return interpretation.primaryIntent;
    default:
      return null;
  }
}
