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

/** Canonical learned social-context profile for exactly one Kaira↔subject dyad. */
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
