/**
 * Canonical compositional semantic interpretation (ADR-0006, schema v2).
 *
 * Replaces the single-label `SemanticEvent` as the language-understanding output.
 * Key properties:
 *  - multi-label: one message can be banter + insult + affection at once
 *  - normalized severity is a VECTOR, not a scalar
 *  - joking / sincerity are explicit confidences
 *  - uncertainty is a first-class field and is never discarded
 *  - evidence records where each reading came from (llm / regex / reconciled)
 *
 * This type is UNWIRED in PR1 (no runtime consumes it authoritatively yet).
 * A legacy projection keeps the old `SemanticEvent` consumers working.
 */

export const SEMANTIC_INTERPRETATION_SCHEMA_VERSION = "semantic-interpretation@2" as const;

export type SemanticPrimaryIntent =
  | "greeting"
  | "smalltalk"
  | "question"
  | "information_request"
  | "emotional_share"
  | "affection"
  | "banter"
  | "insult"
  | "rejection"
  | "apology"
  | "repair"
  | "complaint"
  | "command"
  | "support"
  | "compliment"
  | "boundary_test"
  | "other";

export type SemanticSocialAct =
  | "banter"
  | "insult"
  | "coercion"
  | "manipulation"
  | "affection"
  | "repair"
  | "apology"
  | "boundary_test"
  | "reassurance_seek"
  | "reconciliation"
  | "mockery"
  | "challenge"
  | "closeness_bid"
  | "stop_request"
  | "privacy_violation";

export type SemanticTarget = "kaira" | "third_party" | "self" | "event" | "unknown";

export type SemanticValence = "positive" | "negative" | "neutral";

export type InterpretationEvidenceSource = "llm" | "regex" | "reconciled";

/**
 * Each component is 0..1. They are orthogonal threat dimensions; downstream must
 * read the component it needs rather than a collapsed maximum.
 */
export interface SeverityVector {
  disrespect: number;
  coercion: number;
  manipulation: number;
  privacy: number;
  aggression: number;
}

export interface InterpretationUncertainty {
  /** Aggregate 0..1. 0 = fully confident, 1 = essentially a guess. */
  overall: number;
  intent: number;
  target: number;
  severity: number;
  /** Optional human-readable alternative readings the resolver may want to hedge on. */
  ambiguousReadings?: string[];
}

export interface InterpretationEvidence {
  source: InterpretationEvidenceSource;
  provider?: string;
  /** Matched cues / phrases / model rationale fragments. */
  cues: string[];
  confidence: number;
}

export interface SemanticInterpretation {
  schemaVersion: typeof SEMANTIC_INTERPRETATION_SCHEMA_VERSION;
  raw: string;
  normalized: string;

  primaryIntent: SemanticPrimaryIntent;
  secondarySocialActs: SemanticSocialAct[];
  target: SemanticTarget;
  valence: SemanticValence;

  severity: SeverityVector;
  jokingConfidence: number;
  sincerityConfidence: number;

  affection: number;
  support: number;
  compliment: number;
  emotionalLoad: number;

  apology: boolean;
  repairAttempt: boolean;
  stopRequest: boolean;

  uncertainty: InterpretationUncertainty;
  evidence: InterpretationEvidence[];
}

export const EMPTY_SEVERITY_VECTOR: Readonly<SeverityVector> = Object.freeze({
  disrespect: 0,
  coercion: 0,
  manipulation: 0,
  privacy: 0,
  aggression: 0,
});

/** L2-ish aggregate used by the reducer for graded (not gated) effects. */
export function severityLoad(v: SeverityVector): number {
  const sq =
    v.disrespect * v.disrespect +
    v.coercion * v.coercion +
    v.manipulation * v.manipulation +
    v.privacy * v.privacy +
    v.aggression * v.aggression;
  return Math.min(1, Math.sqrt(sq / 5) * Math.sqrt(5) * 0.62);
}
