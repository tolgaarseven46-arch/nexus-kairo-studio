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
const NON_NEGATIVE_COUNT = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function emptyDyadicSocialNorm(subjectId: string): DyadicSocialNormProfile {
  return {
    version: 0,
    subjectId,
    totalObservedTurns: 0,
    evidence: {},
  };
}

const DYADIC_NORM_KEYS: readonly DyadicNormKey[] = [
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
];

/** Fail closed when hydrating the learned dyadic prior from persistence. */
export function normalizeDyadicSocialNormProfile(
  value: unknown,
  expectedSubjectId = "active-interlocutor",
): DyadicSocialNormProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<DyadicSocialNormProfile>;
  if (source.version !== 0 || source.subjectId !== expectedSubjectId) return undefined;

  const rawEvidence = source.evidence && typeof source.evidence === "object"
    ? source.evidence as Partial<Record<DyadicNormKey, Partial<DyadicNormEvidence>>>
    : {};
  const evidence: Partial<Record<DyadicNormKey, DyadicNormEvidence>> = {};
  for (const key of DYADIC_NORM_KEYS) {
    const raw = rawEvidence[key];
    if (!raw || typeof raw !== "object") continue;
    const observedCount = NON_NEGATIVE_COUNT(raw.observedCount);
    const benignCount = NON_NEGATIVE_COUNT(raw.benignCount);
    const harmfulCount = NON_NEGATIVE_COUNT(raw.harmfulCount);
    const mixedCount = NON_NEGATIVE_COUNT(raw.mixedCount);
    const unknownCount = NON_NEGATIVE_COUNT(raw.unknownCount);
    const accounted = benignCount + harmfulCount + mixedCount + unknownCount;
    evidence[key] = {
      observedCount: Math.max(observedCount, accounted),
      benignCount,
      harmfulCount,
      mixedCount,
      unknownCount,
      ...(typeof raw.lastObservedAt === "string" && raw.lastObservedAt
        ? { lastObservedAt: raw.lastObservedAt }
        : {}),
    };
  }

  return {
    version: 0,
    subjectId: expectedSubjectId,
    totalObservedTurns: Math.max(
      NON_NEGATIVE_COUNT(source.totalObservedTurns),
      Object.values(evidence).reduce((sum, item) => sum + (item?.observedCount ?? 0), 0),
    ),
    evidence,
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