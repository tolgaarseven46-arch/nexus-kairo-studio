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

export type SemanticWorldMemoryValue = string | number | boolean;

/** Canonical attribute-value claim contained in the current utterance. */
export interface SemanticWorldMemoryClaim {
  subjectId: string;
  attributeKey: string;
  value: SemanticWorldMemoryValue;
  confidence: number;
}

/** Canonical attribute lookup requested from persistent world memory. */
export interface SemanticWorldMemoryQuery {
  subjectId: string;
  attributeKey: string;
  confidence: number;
}

export interface SemanticWorldMemorySemantics {
  claims: SemanticWorldMemoryClaim[];
  query: SemanticWorldMemoryQuery | null;
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

export type SemanticGroundingField =
  | "primaryIntent"
  | "secondarySocialActs"
  | "target"
  | "valence"
  | "severity"
  | "affection"
  | "support"
  | "compliment"
  | "emotionalLoad"
  | "apology"
  | "repairAttempt"
  | "stopRequest"
  | "socialRoutine"
  | "discourseAct"
  | "repairSignal"
  | "adviceRequested"
  | "knowledgeQuery"
  | "selfMemoryQuery"
  | "worldMemory"
  | "relationalAct"
  | "stopQuestions"
  | "stopTalking";

/**
 * Provider-computed context provenance. This is observational metadata, not a
 * second semantic authority: it records which canonical fields changed when
 * the same current turn was adjudicated without conversational history.
 */
export interface SemanticGroundingTrace {
  adjudicatedAgainstContextFree: boolean;
  contextInfluencedFields: SemanticGroundingField[];
  rejectedContextFields: SemanticGroundingField[];
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
  /** Dyadic full-conversation stop only; must equal discourseFacets.stopTalking. */
  stopRequest: boolean;

  discourseFacets: SemanticDiscourseFacets;
  /** Structured world-memory semantics; optional for legacy/fallback producers. */
  worldMemory?: SemanticWorldMemorySemantics;
  uncertainty: InterpretationUncertainty;
  evidence: InterpretationEvidence[];
  grounding?: SemanticGroundingTrace;
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
