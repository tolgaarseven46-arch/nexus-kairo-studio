import type { DroitDynamicState, RelationshipState } from "../types/nexus";
import type { BehaviorContract } from "./behaviorContract";
import type { ConversationStateAuthorityResult } from "./conversationStateAuthority";

export interface StateBehaviorInvariantIssue {
  invariant: string;
  message: string;
}

export interface StateBehaviorContractReport {
  accepted: boolean;
  issues: StateBehaviorInvariantIssue[];
}

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value);

const between = (value: unknown, min: number, max: number) =>
  finite(value) && Number(value) >= min && Number(value) <= max;

export function validateRelationshipStateContract(
  relationship?: RelationshipState,
): StateBehaviorContractReport {
  const issues: StateBehaviorInvariantIssue[] = [];
  if (!relationship) return { accepted: true, issues };

  const bounded100: Array<[string, unknown]> = [
    ["warmth", relationship.warmth],
    ["warmthScore", relationship.warmthScore],
    ["trust", relationship.trust],
    ["trustScore", relationship.trustScore],
    ["conflictScore", relationship.conflictScore],
    ["hurtScore", relationship.hurtScore],
    ["repairProgress", relationship.repairProgress],
  ];
  for (const [name, value] of bounded100) {
    if (value !== undefined && !between(value, 0, 100)) {
      issues.push({
        invariant: "relationship.score_range",
        message: `${name} 0..100 aralığında değil: ${String(value)}`,
      });
    }
  }

  const nonNegative: Array<[string, unknown]> = [
    ["interactionCount", relationship.interactionCount],
    ["familiarityDays", relationship.familiarityDays],
    ["positiveEvents", relationship.positiveEvents],
    ["negativeEvents", relationship.negativeEvents],
    ["repeatedNegativeCount", relationship.repeatedNegativeCount],
    ["repairAttempts", relationship.repairAttempts],
  ];
  for (const [name, value] of nonNegative) {
    if (value !== undefined && (!finite(value) || Number(value) < 0)) {
      issues.push({
        invariant: "relationship.counter_non_negative",
        message: `${name} negatif veya geçersiz: ${String(value)}`,
      });
    }
  }

  return { accepted: issues.length === 0, issues };
}

export function validateDynamicStateContract(
  state: DroitDynamicState,
): StateBehaviorContractReport {
  const issues: StateBehaviorInvariantIssue[] = [];
  for (const [name, value] of Object.entries({
    calmness: state.calmness,
    anger: state.anger,
    stress: state.stress,
    happiness: state.happiness,
    confidence: state.confidence,
    surprise: state.surprise,
  })) {
    if (!between(value, 0, 100)) {
      issues.push({
        invariant: "dynamic_state.score_range",
        message: `${name} 0..100 aralığında değil: ${String(value)}`,
      });
    }
  }

  const relationshipReport = validateRelationshipStateContract(state.relationship);
  issues.push(...relationshipReport.issues);
  return { accepted: issues.length === 0, issues };
}

export function validateBehaviorContractConsistency(
  state: DroitDynamicState,
  contract: BehaviorContract,
): StateBehaviorContractReport {
  const issues: StateBehaviorInvariantIssue[] = [];
  const relationshipState = state.relationship?.conversationState ?? "active";

  if (contract.conversationState !== relationshipState) {
    issues.push({
      invariant: "behavior.state_authority",
      message: `BehaviorContract conversationState=${contract.conversationState}, relationship=${relationshipState}.`,
    });
  }

  if (relationshipState === "disengaged") {
    if (contract.continueConversation) {
      issues.push({ invariant: "behavior.disengaged_no_continue", message: "disengaged durumda continueConversation true olamaz." });
    }
    if (contract.questions !== "forbidden" || contract.playfulness !== "forbidden" || contract.affection !== "forbidden") {
      issues.push({ invariant: "behavior.disengaged_closure", message: "disengaged durumda soru/mizah/yakınlık yasak olmalıdır." });
    }
  }

  if (relationshipState === "repairing") {
    if (contract.forgivenessGranted) {
      issues.push({ invariant: "behavior.repair_not_forgiven", message: "repairing sürerken forgivenessGranted true olamaz." });
    }
    if (contract.reopeningCloseness !== "forbidden") {
      issues.push({ invariant: "behavior.repair_no_reopen", message: "repairing sürerken yakınlık yeniden açılamaz." });
    }
  }

  if (relationshipState === "distancing" && contract.playfulness !== "forbidden") {
    issues.push({ invariant: "behavior.distancing_no_playfulness", message: "distancing durumda playfulness yasak olmalıdır." });
  }

  return { accepted: issues.length === 0, issues };
}

export function validateConversationAuthorityContract(
  state: DroitDynamicState,
  authority: ConversationStateAuthorityResult,
): StateBehaviorContractReport {
  const issues: StateBehaviorInvariantIssue[] = [];
  const relationshipState = state.relationship?.conversationState ?? "active";

  if (authority.state !== relationshipState) {
    issues.push({
      invariant: "authority.state_match",
      message: `Authority state=${authority.state}, relationship state=${relationshipState}.`,
    });
  }

  if (relationshipState === "active" && authority.locked) {
    issues.push({ invariant: "authority.active_unlocked", message: "active durumda authority lock olmamalıdır." });
  }
  if (relationshipState !== "active" && !authority.locked) {
    issues.push({ invariant: "authority.non_active_locked", message: "active dışı relationship state authority tarafından kilitlenmelidir." });
  }

  if (relationshipState === "disengaged") {
    const p = authority.personality as Record<string, number | undefined>;
    if ((p.runtimeContinueConversation ?? 100) !== 0 || (p.runtimeAskQuestion ?? 100) !== 0 || (p.runtimeHumorAllowed ?? 100) !== 0) {
      issues.push({ invariant: "authority.disengaged_runtime_lock", message: "disengaged runtime continue/question/humor bayraklarını kapatmalıdır." });
    }
  }

  return { accepted: issues.length === 0, issues };
}

export function validateStateBehaviorSeam(input: {
  state: DroitDynamicState;
  behavior: BehaviorContract;
  authority: ConversationStateAuthorityResult;
}): StateBehaviorContractReport {
  const reports = [
    validateDynamicStateContract(input.state),
    validateBehaviorContractConsistency(input.state, input.behavior),
    validateConversationAuthorityContract(input.state, input.authority),
  ];
  const issues = reports.flatMap((report) => report.issues);
  return { accepted: issues.length === 0, issues };
}
