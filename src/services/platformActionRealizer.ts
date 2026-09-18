import {
  PRIVATROOM_PLATFORM_CONTRACT_VERSION,
  type PlatformActionFeasibilityRequestV1,
  type PlatformActionFeasibilityResultV1,
  type PlatformCapabilityConstraints,
  type ProposedPlatformAction,
} from "../integrations/privatroom/platformContracts";
import type {
  PlatformActionIntent,
  PlatformActionPolicySelection,
  ServerRulesDraftIntent,
} from "./platformActionDecision";

export function buildPlatformActionFeasibilityRequest(
  selection: PlatformActionPolicySelection,
  requestedAt: number,
): PlatformActionFeasibilityRequestV1 {
  return {
    contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
    requestId: `feasibility_${selection.intentId}`,
    intentId: selection.intentId,
    requestedCapability: selection.requestedCapability,
    serverId: selection.serverId,
    roomId: selection.roomId,
    targetUserId: selection.targetUserId,
    requestedAt,
  };
}

export interface RealizePlatformActionInput {
  intent: PlatformActionIntent;
  selection: PlatformActionPolicySelection;
  feasibility: PlatformActionFeasibilityResultV1;
  actionId: string;
  ruleDraft?: Array<{ ruleId: string; text: string }>;
  reasonText?: string;
}

function assertRealizerBoundary(
  input: RealizePlatformActionInput,
): PlatformCapabilityConstraints | undefined {
  const { intent, selection, feasibility } = input;

  if (selection.intentId !== intent.intentId) {
    throw new Error("platform_action_realizer_intent_mismatch");
  }
  if (feasibility.intentId !== intent.intentId) {
    throw new Error("platform_action_realizer_feasibility_intent_mismatch");
  }
  if (feasibility.requestedCapability !== selection.requestedCapability) {
    throw new Error("platform_action_realizer_capability_mismatch");
  }
  if (feasibility.status === "denied") {
    throw new Error("platform_action_realizer_denied");
  }

  return feasibility.constraints;
}

function boundedTimeoutDuration(
  severity: number,
  constraints?: PlatformCapabilityConstraints,
): number {
  const severityClamped = Math.max(0, Math.min(1, severity));
  const policyDuration =
    severityClamped < 0.4
      ? 5 * 60_000
      : severityClamped < 0.7
        ? 15 * 60_000
        : 60 * 60_000;
  return Math.min(policyDuration, constraints?.maxTimeoutMs ?? policyDuration);
}

function requireReason(reasonText?: string): string {
  const reason = String(reasonText || "").trim();
  if (!reason) throw new Error("platform_action_realizer_reason_required");
  return reason;
}

function realizeRulesProposal(
  intent: ServerRulesDraftIntent,
  input: RealizePlatformActionInput,
): ProposedPlatformAction {
  const rules = input.ruleDraft ?? [];
  if (rules.length === 0) {
    throw new Error("platform_action_realizer_rule_draft_required");
  }

  return {
    actionId: input.actionId,
    type: "server.rules.propose",
    requestedCapability: "server.rules.propose",
    serverId: intent.serverId,
    roomId: intent.roomId,
    rulesVersionBase: intent.rulesVersionBase,
    rules,
    basedOnEventIds: intent.basedOnEventIds,
    confidence: intent.confidence,
  };
}

export function realizePlatformActionProposal(
  input: RealizePlatformActionInput,
): ProposedPlatformAction {
  const constraints = assertRealizerBoundary(input);
  const { intent, selection } = input;

  if (intent.kind === "server_rules_draft") {
    if (selection.requestedCapability !== "server.rules.propose") {
      throw new Error("platform_action_realizer_policy_type_mismatch");
    }
    return realizeRulesProposal(intent, input);
  }

  const common = {
    actionId: input.actionId,
    serverId: intent.serverId,
    roomId: intent.roomId,
    targetUserId: intent.targetUserId,
    reason: requireReason(input.reasonText),
    basedOnEventIds: intent.basedOnEventIds,
    confidence: intent.confidence,
  };

  switch (selection.requestedCapability) {
    case "member.warn":
      return {
        ...common,
        type: "member.warn",
        requestedCapability: "member.warn",
      };
    case "member.timeout":
      return {
        ...common,
        type: "member.timeout",
        requestedCapability: "member.timeout",
        durationMs: boundedTimeoutDuration(intent.severity, constraints),
      };
    case "member.kick":
      return {
        ...common,
        type: "member.kick",
        requestedCapability: "member.kick",
      };
    case "member.ban":
      return {
        ...common,
        type: "member.ban",
        requestedCapability: "member.ban",
      };
    default:
      throw new Error("platform_action_realizer_unsupported_policy");
  }
}
