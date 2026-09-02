/**
 * PlanResolver (ADR-0006, PR2).
 *
 * Resolves HardConstraintSet + SoftTendencyProfile (+ per-turn uncertainty) into
 * a single behavior snapshot. This is NOT a state machine: it is a pure function
 * of the two layers for THIS turn. Hard constraints CLAMP; soft tendencies FILL
 * the room left inside them. `chosenTone` / `register` / `stance` are emitted
 * only as `projections` — non-authoritative style hints. The realizer may not
 * re-derive a behavior decision from them.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import type {
  HardConstraintSet,
  KairaPlanProjections,
  KairaPlanUncertainty,
  SoftTendencyProfile,
} from "../types/kairaBehaviorPlan";

export interface ResolveKairaPlanInput {
  hard: HardConstraintSet;
  soft: SoftTendencyProfile;
  dialogue: DialogueDecisionPlan;
  speech: KairoSpeechIdentity;
  contract: BehaviorContract;
  uncertainty?: Partial<KairaPlanUncertainty>;
}

export interface ResolvedKairaPlan {
  continueConversation: boolean;
  allowQuestion: boolean;
  allowHumor: boolean;
  allowAffection: boolean;
  allowForgiveness: boolean;
  allowReopeningCloseness: boolean;
  maxSentences: number;
  maxWords: number;
  emojiBudget: number;
  /** Orthogonal axes carried through for telemetry — live even under disengage. */
  opennessAxis: number;
  warmthAxis: number;
  guardedness: number;
  intimacyCeiling: number;
  requiredContent: string[];
  hardReasons: string[];
  uncertainty: KairaPlanUncertainty;
  projections: KairaPlanProjections;
  resolverRationale: string[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function toneProjection(soft: SoftTendencyProfile, hard: HardConstraintSet): string {
  if (hard.hardDisengage) return "closed";
  if (hard.mustAcknowledgeBoundary) return "repairing-careful";
  if (soft.warmthTendency >= 0.6 && soft.guardedness <= 0.35) return "warm-open";
  if (soft.guardedness >= 0.6) return "reserved";
  if (soft.warmthTendency >= 0.5) return "warm-measured";
  return "neutral";
}

export function resolveKairaResponsePlan(input: ResolveKairaPlanInput): ResolvedKairaPlan {
  const { hard, soft, dialogue, speech, contract } = input;
  const rationale: string[] = [];

  const uncertainty: KairaPlanUncertainty = {
    semantic: clamp01(input.uncertainty?.semantic ?? 0.4),
    relational: clamp01(input.uncertainty?.relational ?? 0.35),
  };
  // High uncertainty pulls graded drives toward caution without flipping a gate.
  const cautious = Math.max(uncertainty.semantic, uncertainty.relational);
  const damp = (n: number) => clamp01(n * (1 - 0.35 * cautious));

  const continueConversation = !hard.hardDisengage;

  const allowQuestion =
    hard.questionAllowed && dialogue.allowFollowUpQuestion && damp(soft.questionDrive) >= 0.3;

  const allowHumor = hard.humorAllowed && damp(soft.humorInclination) >= 0.28;

  // Intimacy: character-policy ceiling first, then the soft inclination fills it.
  let intimacyCeiling = Math.min(hard.intimacyCeiling, soft.intimacyInclination);
  if (!hard.flirtingAllowed) intimacyCeiling = Math.min(intimacyCeiling, 0.5);
  intimacyCeiling = clamp01(intimacyCeiling);

  const allowAffection =
    hard.affectionAllowed && intimacyCeiling >= 0.3 && damp(soft.warmthTendency) >= 0.35;

  const allowForgiveness = hard.forgivenessAllowed && soft.opennessTendency >= 0.25;

  const allowReopeningCloseness =
    hard.reopeningClosenessAllowed &&
    soft.opennessTendency >= 0.35 &&
    soft.guardedness <= 0.7;

  // Length: hard ceiling is absolute; low verbosity tendency may shrink it.
  const maxSentences =
    soft.verbosityTendency < 0.35 ? Math.max(1, Math.min(hard.maxSentences, 1)) : hard.maxSentences;
  const maxWords = Math.max(
    1,
    Math.min(hard.maxWords, Math.round(hard.maxWords * (0.6 + 0.4 * soft.verbosityTendency))),
  );

  const emojiBudget =
    hard.emojiBudget > 0 && soft.warmthTendency >= 0.4 && !hard.mustAcknowledgeBoundary ? 1 : 0;

  const requiredContent: string[] = [];
  if (hard.hardDisengage) requiredContent.push("state_boundary_and_close");
  else if (hard.mustAcknowledgeBoundary) requiredContent.push("acknowledge_boundary");

  if (cautious >= 0.6) rationale.push(`uncertainty_damping applied (cautious=${cautious.toFixed(2)})`);
  rationale.push(...hard.reasons, ...soft.rationale);

  return {
    continueConversation,
    allowQuestion,
    allowHumor,
    allowAffection,
    allowForgiveness,
    allowReopeningCloseness,
    maxSentences,
    maxWords,
    emojiBudget,
    // axes stay populated even when hardDisengage vetoes the gates above (K2)
    opennessAxis: soft.opennessTendency,
    warmthAxis: soft.warmthTendency,
    guardedness: soft.guardedness,
    intimacyCeiling,
    requiredContent,
    hardReasons: hard.reasons,
    uncertainty,
    projections: {
      toneProjection: toneProjection(soft, hard),
      register: speech.register,
      stance: contract.stance,
      relationshipLevel: speech.relationshipLevel,
    },
    resolverRationale: rationale,
  };
}
