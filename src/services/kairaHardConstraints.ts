/**
 * HardConstraintSet derivation (ADR-0006, PR2).
 *
 * The deontic layer. It answers only "what is forbidden / mandatory this turn",
 * from character policy, the resolved BehaviorContract and the already-resolved
 * dialogue move. Everything graded lives in SoftTendencyProfile. A `false` gate
 * here is absolute — no soft tendency may reopen it.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { HardConstraintSet, KairaCharacterPolicy } from "../types/kairaBehaviorPlan";

export const DEFAULT_KAIRA_CHARACTER_POLICY: KairaCharacterPolicy = {
  flirtingAllowed: false,
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

export const NON_ROMANTIC_INTIMACY_CEILING = 0.25;

const BOUNDARY_REASON_RE =
  /(disengage|boundary|red[_-]?line|ihlal|sınır|user_stop|stop)/i;

const DIALOGUE_FOCUSED_MOVES = new Set<DialogueDecisionPlan["move"]>([
  "grounded_recall",
  "invite_emotional_context",
  "repair_or_rephrase",
  "follow_previous_answer",
  "acknowledge_correction",
]);

export function deriveHardConstraints(
  contract: BehaviorContract,
  dialogue: DialogueDecisionPlan,
  policy: KairaCharacterPolicy = DEFAULT_KAIRA_CHARACTER_POLICY,
): HardConstraintSet {
  const reasons: string[] = [];
  const dialogueFocused = DIALOGUE_FOCUSED_MOVES.has(dialogue.move);

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
  if (dialogueFocused) reasons.push(`dialogue_focus:${dialogue.move}`);

  // Dialogue authority is already resolved before the behavior plan. Focused
  // factual/repair/emotional moves may NARROW social permissions, and no soft
  // tendency is allowed to reopen them in PlanResolver.
  const questionAllowed =
    !hardDisengage && contract.questions === "allowed";
  const humorAllowed =
    !hardDisengage && contract.playfulness === "allowed" && !dialogueFocused;
  const affectionAllowed =
    !hardDisengage && contract.affection === "allowed" && !dialogueFocused;
  const adviceAllowed =
    !hardDisengage && contract.advice === "allowed";
  const forgivenessAllowed =
    contract.forgivenessGranted && !hardDisengage && !dialogueFocused;
  const reopeningClosenessAllowed =
    !hardDisengage && contract.reopeningCloseness === "allowed" && !dialogueFocused;

  if (!adviceAllowed) reasons.push("unsolicited_advice_forbidden");

  const contractSentences = contract.maxResponseLength === "short" ? 1 : 2;
  const maxSentences = Math.max(1, Math.min(dialogue.maxSentences, contractSentences));
  const contractWords = contract.maxResponseLength === "short" ? 14 : 32;
  const maxWords = Math.max(1, Math.min(dialogue.maxWords ?? contractWords, contractWords));
  const dialogueEmojiBlocked = dialogueFocused || dialogue.move === "join_banter";
  const emojiBudget =
    !hardDisengage && contract.stance === "open" && !dialogueEmojiBlocked ? 1 : 0;

  const flirtingAllowed = policy.flirtingAllowed === true && !hardDisengage;
  const intimacyCeiling = hardDisengage
    ? 0
    : flirtingAllowed
      ? Math.max(0, Math.min(1, policy.maxIntimacy))
      : NON_ROMANTIC_INTIMACY_CEILING;
  if (!policy.flirtingAllowed) reasons.push("flirtation_forbidden_by_character_policy");

  return {
    hardDisengage,
    hardDisengageReason,
    mustAcknowledgeBoundary,
    flirtingAllowed,
    counterFlirtAllowed: flirtingAllowed,
    acceptsSlurBanter: policy.acceptsSlurBanter,
    epistemicHonesty: policy.epistemicHonesty,
    intimacyCeiling,
    questionAllowed,
    humorAllowed,
    affectionAllowed,
    adviceAllowed,
    forgivenessAllowed,
    reopeningClosenessAllowed,
    maxSentences,
    maxWords,
    emojiBudget,
    reasons,
  };
}
