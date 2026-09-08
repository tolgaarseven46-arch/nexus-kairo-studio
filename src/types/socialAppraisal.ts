import type { SemanticInterpretation } from "./semanticInterpretation";
import type { DyadicSocialNormProfile } from "./dyadicSocialNorm";
import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  RelationshipState,
} from "./nexus";

/**
 * Bounded, person-specific summary of canonical lived autobiography.
 * It intentionally carries no raw facts, event text, eventType, or emotion labels,
 * so SocialAppraisal cannot become a second semantic interpreter.
 */
export interface SocialAppraisalAutobiographicalContext {
  /** Stable durable participant id for the active user, e.g. user:<owner-scope>. */
  participantId: string;
  /** Number of ordinary lived autobiographical episodes involving this participant. */
  episodeCount: number;
  /** Episodes whose canonical salience is materially high (>= 0.65). */
  salientEpisodeCount: number;
  /** 0..1 mean canonical episode salience. */
  meanSalience: number;
  /** 0..1 strongest canonical episode salience. */
  maxSalience: number;
  /** 0..1 mean per-episode maximum emotional intensity, labels intentionally omitted. */
  meanEmotionalIntensity: number;
}

export interface SocialAppraisalMemoryContext {
  /** Structured summaries only. SocialAppraisal must never reparse raw history. */
  relationshipEpisodes?: readonly unknown[];
  autobiographical?: Readonly<SocialAppraisalAutobiographicalContext> | null;
  world?: readonly unknown[];
}

export interface SocialAppraisalInput {
  /** Canonical per-turn semantic authority. */
  semantic: SemanticInterpretation;
  /** Existing slow relationship projection for the active Kaira-user dyad. */
  relationship: Readonly<RelationshipState>;
  /** Canonical learned social-context profile for this active Kaira-user dyad. */
  dyadicNorm?: Readonly<DyadicSocialNormProfile>;
  /** Current Kaira state may modulate sensitivity only through bounded appraisal rules. */
  currentState: Readonly<DroitDynamicState>;
  /** Stable character traits/boundaries. */
  personality: Readonly<DroitPersonalityTraits>;
  /** Relevant structured memory summaries. */
  memory?: Readonly<SocialAppraisalMemoryContext>;
}

export type AppraisalValence = "negative" | "neutral" | "positive";

/** Relationship-facing projection. Zero magnitude is a first-class result. */
export interface RelationalAppraisalProjection {
  valence: AppraisalValence;
  /** 0..1 material relational significance. */
  significance: number;
  /** 0..1 evidence that the event should create/extend injury. */
  harmEvidence: number;
  /** 0..1 evidence that the event should advance relationship repair. */
  repairEvidence: number;
}

/** Affect-facing projection. Independent from relational significance. */
export interface AffectiveAppraisalProjection {
  valence: AppraisalValence;
  /** 0..1 material affective significance. */
  significance: number;
  /** 0..1 activation/arousal pressure; transition math remains outside appraisal. */
  activation: number;
}

export interface SocialAppraisalResult {
  /** 0..1 learned-context expectation for this event family. */
  expectedness: number;
  /** 0..1 deviation from the active dyad's learned social norm. */
  normDeviation: number;
  /** 0..1 confidence in this appraisal result. */
  confidence: number;
  relational: RelationalAppraisalProjection;
  affective: AffectiveAppraisalProjection;
  /** True only when both projections have zero material significance. */
  noMaterialEffect: boolean;
  /** Auditable construct-level reasons/provenance, never hidden raw-text reparses. */
  reasons: readonly string[];
}

/**
 * Contract invariant: zero effect means both independent projections are zero.
 * A relationship-neutral event may still have affective impact and vice versa.
 */
export function socialAppraisalHasNoMaterialEffect(
  result: Pick<SocialAppraisalResult, "relational" | "affective">,
): boolean {
  return result.relational.significance <= 0 && result.affective.significance <= 0;
}
