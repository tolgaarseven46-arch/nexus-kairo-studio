/**
 * HardConstraintSet derivation (ADR-0006, PR2).
 *
 * The deontic layer. It answers only "what is forbidden / mandatory this turn",
 * from two sources that relationship dynamics cannot move:
 *   - character policy (config/kaira-character-policy.json)
 *   - the already-resolved BehaviorContract's hard facts (disengaged, forbidden
 *     permissions, repair obligations, length ceilings)
 *
 * Everything graded lives in SoftTendencyProfile. A `false` gate here is
 * absolute — no soft tendency may reopen it.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { HardConstraintSet, KairaCharacterPolicy } from "../types/kairaBehaviorPlan";

export const DEFAULT_KAIRA_CHARACTER_POLICY: KairaCharacterPolicy = {
  flirtingAllowed: true,
  acceptsSlurBanter: true,
  epistemicHonesty: true,
  maxIntimacy: 0.85,
  hardDisengageReasons: [
    "user_stop",
    "combined_boundary_violation",
    "severe_single_turn_violation",
    "repeated_boundary_violation",
  ],
};

const BOUNDARY_REASON_RE =
  /(disengage|boundary|red[_-]?line|ihlal|sınır|user_stop|stop)/i;

export function deriveHardConstraints(
  contract: BehaviorContract,
  dialogue: DialogueDecisionPlan,
  policy: KairaCharacterPolicy = DEFAULT_KAIRA_CHARACTER_POLICY,
): HardConstraintSet {
  const reasons: string[] = [];

  // Hard stop keys off the contract's explicit "do not continue" decision, NOT
  // off the conversationState label directly (K2): an FSM that drifts to
  // "disengaged" while still permitting continuation is handled by the soft
  // layer, not vetoed here.
  const hardDisengage = contract.continueConversation === false;
  const hardDisengageReason = hardDisengage
    ? contract.reasons.find((r) => BOUNDARY_REASON_RE.test(r)) ?? "boundary_or_safety_stop"
    : null;
  if (hardDisengage) reasons.push(`hard_disengage:${hardDisengageReason}`);

  const mustAcknowledgeBoundary =
    !hardDisengage &&
    (contract.stance === "repairing-cautious" ||
      contract.repairStatus === "incomplete" ||
      contract.repairStatus === "repairing");
  if (mustAcknowledgeBoundary) reasons.push("must_acknowledge_boundary");

  // Permission vetoes: "forbidden" is a hard NO; "allowed" defers to the soft layer.
  const questionAllowed = !hardDisengage && contract.questions === "allowed";
  const humorAllowed = !hardDisengage && contract.playfulness === "allowed";
  const affectionAllowed = !hardDisengage && contract.affection === "allowed";
  const forgivenessAllowed = contract.forgivenessGranted && !hardDisengage;
  const reopeningClosenessAllowed =
    !hardDisengage && contract.reopeningCloseness === "allowed";

  // Length ceilings mirror the legacy contract/dialogue clamp.
  const contractSentences = contract.maxResponseLength === "short" ? 1 : 2;
  const maxSentences = Math.max(1, Math.min(dialogue.maxSentences, contractSentences));
  const contractWords = contract.maxResponseLength === "short" ? 14 : 32;
  const maxWords = Math.max(1, Math.min(dialogue.maxWords ?? contractWords, contractWords));
  // Emoji ceiling: only an open stance permits any; soft layer may still zero it.
  const emojiBudget = !hardDisengage && contract.stance === "open" ? 1 : 0;

  return {
    hardDisengage,
    hardDisengageReason,
    mustAcknowledgeBoundary,
    flirtingAllowed: policy.flirtingAllowed && !hardDisengage,
    acceptsSlurBanter: policy.acceptsSlurBanter,
    epistemicHonesty: policy.epistemicHonesty,
    intimacyCeiling: hardDisengage ? 0 : Math.max(0, Math.min(1, policy.maxIntimacy)),
    questionAllowed,
    humorAllowed,
    affectionAllowed,
    forgivenessAllowed,
    reopeningClosenessAllowed,
    maxSentences,
    maxWords,
    emojiBudget,
    reasons,
  };
}
