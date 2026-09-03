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

export type SemanticSocialRoutine =
  | "none"
  | "greeting"
  | "how_are_you"
  | "what_doing"
  | "thanks"
  | "agreement"
  | "goodbye"
  | "good_night"
  | "emotional_opening";

export type SemanticDiscourseAct =
  | "none"
  | "correction"
  | "topic_shift"
  | "recall_request"
  | "confusion_or_challenge";

export type SemanticRepairSignal =
  | "none"
  | "clarification_request"
  | "relevance_challenge";

export type SemanticRelationalAct =
  | "none"
  | "reassurance_seek"
  | "repair_probe"
  | "reconciliation_attempt"
  | "challenge"
  | "mockery"
  | "closeness_bid";

export interface SemanticKnowledgeQuery {
  surface: string;
  conceptId?: string;
  confidence: number;
}

export interface SemanticSelfMemoryQuery {
  surface: string;
  scope: "self_fact" | "autobiographical_memory" | "any";
  factKey?: string;
  retrievalMode: "targeted" | "broad";
  confidence: number;
}

/**
 * Canonical discourse-facing facets that are still utterance semantics.
 * These are produced once at ingestion. DiscourseState may consume them, but it
 * must never recreate them from raw text.
 */
export interface SemanticDiscourseFacets {
  socialRoutine: SemanticSocialRoutine;
  discourseAct: SemanticDiscourseAct;
  repairSignal: SemanticRepairSignal;
  adviceRequested: boolean;
  knowledgeQuery: SemanticKnowledgeQuery | null;
  selfMemoryQuery: SemanticSelfMemoryQuery | null;
  relationalAct: SemanticRelationalAct;
  relationalIntensity: number;
  stopQuestions: boolean;
  stopTalking: boolean;
}

/** Each component is 0..1 and orthogonal. */
export interface SeverityVector {
  disrespect: number;
  coercion: number;
  manipulation: number;
  privacy: number;
  aggression: number;
}

export interface InterpretationUncertainty {
  overall: number;
  intent: number;
  target: number;
  severity: number;
  ambiguousReadings?: string[];
}

export interface InterpretationEvidence {
  source: InterpretationEvidenceSource;
  provider?: string;
  cues: string[];
  confidence: number;
}

/**
 * Canonical immutable per-turn semantic truth (ADR-0006).
 *
 * `SemanticEvent` is only a deterministic compatibility projection of this
 * object. No downstream consumer may use raw text to enrich or reinterpret it.
 */
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

  discourseFacets: SemanticDiscourseFacets;
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

export function severityLoad(v: SeverityVector): number {
  const sq =
    v.disrespect * v.disrespect +
    v.coercion * v.coercion +
    v.manipulation * v.manipulation +
    v.privacy * v.privacy +
    v.aggression * v.aggression;
  return Math.min(1, Math.sqrt(sq / 5) * Math.sqrt(5) * 0.62);
}
