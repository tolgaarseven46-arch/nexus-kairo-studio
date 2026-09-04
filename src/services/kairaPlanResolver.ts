/**
 * PlanResolver (ADR-0006, PR2/PR5).
 *
 * Resolves HardConstraintSet + SoftTendencyProfile (+ per-turn uncertainty) into
 * a single behavior snapshot. This is NOT a state machine: it is a pure function
 * of the two layers for THIS turn. Hard constraints CLAMP; soft tendencies FILL
 * the room left inside them. `chosenTone` / `register` / speech-style signals are
 * projections only and must never create or revoke WHAT/WHETHER permissions.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import type {
  HardConstraintSet,
  KairaExpressionMode,
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
  flirtationAllowed: boolean;
  counterFlirtAllowed: boolean;
  maxSentences: number;
  maxWords: number;
  emojiBudget: number;
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

function expressionModeProjection(
  hard: HardConstraintSet,
  contract: BehaviorContract,
): KairaExpressionMode {
  if (hard.hardDisengage) {
    return contract.repairStatus === "incomplete" ? "natural_repair" : "firm_boundary";
  }
  if (hard.mustAcknowledgeBoundary) return "careful_repair";
  return "natural_social";
}

export function resolveKairaResponsePlan(input: ResolveKairaPlanInput): ResolvedKairaPlan {
  const { hard, soft, dialogue, speech, contract } = input;
  const rationale: string[] = [];

  const uncertainty: KairaPlanUncertainty = {
    semantic: clamp01(input.uncertainty?.semantic ?? 0.4),
    relational: clamp01(input.uncertainty?.relational ?? 0.35),
  };
  const cautious = Math.max(uncertainty.semantic, uncertainty.relational);
  const damp = (n: number) => clamp01(n * (1 - 0.35 * cautious));

  const continueConversation = !hard.hardDisengage;

  const allowQuestion =
    hard.questionAllowed && dialogue.allowFollowUpQuestion && damp(soft.questionDrive) >= 0.3;

  // `allowHumor` is a permission. SpeechIdentity.humorLevel is HOW and may
  // influence whether the realizer actually uses humor, but must not revoke an
  // otherwise allowed behavior permission.
  const allowHumor = hard.humorAllowed;

  const flirtationAllowed = hard.flirtingAllowed === true;
  const counterFlirtAllowed = hard.counterFlirtAllowed === true;
  if (!flirtationAllowed) rationale.push("flirtation:hard-forbidden (character policy)");

  const intimacyCeiling = clamp01(Math.min(hard.intimacyCeiling, soft.intimacyInclination));

  const allowAffection =
    hard.affectionAllowed && intimacyCeiling >= 0.3 && damp(soft.warmthTendency) >= 0.35;

  const allowForgiveness = hard.forgivenessAllowed && soft.opennessTendency >= 0.25;

  const allowReopeningCloseness =
    hard.reopeningClosenessAllowed &&
    soft.opennessTendency >= 0.35 &&
    soft.guardedness <= 0.7;

  const maxSentences =
    soft.verbosityTendency < 0.35 ? Math.max(1, Math.min(hard.maxSentences, 1)) : hard.maxSentences;
  const maxWords = hard.hardDisengage
    ? Math.max(4, hard.maxWords)
    : Math.max(
        1,
        Math.min(hard.maxWords, Math.round(hard.maxWords * (0.6 + 0.4 * soft.verbosityTendency))),
      );

  const emojiBudget =
    hard.emojiBudget > 0 && soft.warmthTendency >= 0.4 && !hard.mustAcknowledgeBoundary ? 1 : 0;

  // WHAT only. These labels say which semantic obligations must be preserved;
  // they never prescribe a sentence shape, state narration, or turn-closing style.
  const requiredContent: string[] = [];
  if (hard.hardDisengage) requiredContent.push("boundary_maintained");
  else if (hard.mustAcknowledgeBoundary) requiredContent.push("boundary_acknowledged");
  if (!counterFlirtAllowed) requiredContent.push("no_counter_flirt");

  if (cautious >= 0.6) rationale.push(`uncertainty_damping applied (cautious=${cautious.toFixed(2)})`);
  rationale.push(...hard.reasons, ...soft.rationale);

  return {
    continueConversation,
    allowQuestion,
    allowHumor,
    allowAffection,
    allowForgiveness,
    allowReopeningCloseness,
    flirtationAllowed,
    counterFlirtAllowed,
    maxSentences,
    maxWords,
    emojiBudget,
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
      expressionMode: expressionModeProjection(hard, contract),
    },
    resolverRationale: rationale,
  };
}
