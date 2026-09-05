/**
 * Canonical behavior contract types (ADR-0006, PR2).
 *
 * Three layers, resolved once per turn into a single `KairaResponsePlan` snapshot:
 *
 *   HardConstraintSet   — deontic. Character-policy + safety vetoes. Absolute.
 *   SoftTendencyProfile — graded, relationship-conditioned inclinations. Never
 *                         a single ordinal: openness / warmth / guardedness are
 *                         orthogonal axes (K2).
 *   PlanResolver        — hard CLAMPS, soft FILLS. The output is a resolved
 *                         snapshot, not a state machine. The realizer/LLM may
 *                         not re-interpret it; `chosenTone` / `register` /
 *                         `stance` are projections for compat only.
 */

import type { BehaviorContract } from "../services/behaviorContract";
import type { KairoSpeechIdentity } from "../services/kairoSpeechIdentity";

export interface KairaCharacterPolicy {
  /** Kaira tolerates flirtation / romantic register at all. */
  flirtingAllowed: boolean;
  /** Kaira reads slur-word banter from close users as play rather than injury. */
  acceptsSlurBanter: boolean;
  /** Kaira never fabricates or performs certainty she does not have. */
  epistemicHonesty: boolean;
  /** Absolute upper bound on intimacy this character will express (0..1). */
  maxIntimacy: number;
  /** Hard-disengage reasons that always end the turn regardless of relationship. */
  hardDisengageReasons: string[];
}

export interface HardConstraintSet {
  /** Safety / boundary stop — the turn ends, nothing soft can reopen it. */
  hardDisengage: boolean;
  hardDisengageReason: string | null;
  /** The reply must contain an explicit boundary acknowledgement. */
  mustAcknowledgeBoundary: boolean;
  /** Character-policy gates (not relationship-conditioned). */
  flirtingAllowed: boolean;
  /**
   * Whether Kaira may flirt BACK. Follows `flirtingAllowed` exactly — an absolute
   * mirror of the character policy. Nothing graded can raise it.
   */
  counterFlirtAllowed: boolean;
  acceptsSlurBanter: boolean;
  epistemicHonesty: boolean;
  intimacyCeiling: number;
  /** Hard vetoes only — a `false` here can never be overridden by a soft tendency. */
  questionAllowed: boolean;
  humorAllowed: boolean;
  affectionAllowed: boolean;
  /** Runtime derivation always supplies this; optional only for old fixtures. */
  adviceAllowed?: boolean;
  forgivenessAllowed: boolean;
  reopeningClosenessAllowed: boolean;
  /** Length / emoji ceilings. */
  maxSentences: number;
  maxWords: number;
  emojiBudget: number;
  reasons: string[];
}

export interface SoftTendencyProfile {
  /** Orthogonal axes — NOT collapsible to one guardedness ordinal (K2). */
  opennessTendency: number;
  warmthTendency: number;
  guardedness: number;
  /** Graded behavioral drives, 0..1. */
  humorInclination: number;
  questionDrive: number;
  intimacyInclination: number;
  verbosityTendency: number;
  rationale: string[];
}

export interface KairaPlanUncertainty {
  /** How unsure the upstream semantic read was for this turn (0..1). */
  semantic: number;
  /** How unsure the relationship read is (0..1). */
  relational: number;
}

export type KairaSocialMove =
  | "none"
  | "accept_repair"
  | "reciprocate_nonromantic_closeness"
  | "warm_deflect"
  | "set_boundary"
  | "maintain_boundary";

export type KairaExpressionMode =
  | "natural_social"
  | "firm_boundary"
  | "natural_repair"
  | "careful_repair";

/**
 * Non-authoritative. Legacy consumers and the prompt builder read these for
 * style hints only. Nothing downstream may re-derive a behavior decision from
 * them — the boolean gates on `KairaResponsePlan` are the only authority.
 */
export interface KairaPlanProjections {
  toneProjection: string;
  register: KairoSpeechIdentity["register"];
  stance: BehaviorContract["stance"];
  relationshipLevel: KairoSpeechIdentity["relationshipLevel"];
  /** HOW-only projection. It cannot open/close any behavioral gate. */
  expressionMode?: KairaExpressionMode;
}
