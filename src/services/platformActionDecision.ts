import type { PlatformCapability } from "../integrations/privatroom/platformContracts";

export type PlatformActionDecisionKind =
  | "server_rules_draft"
  | "moderation_boundary_response";

export interface PlatformActionEvidenceRef {
  eventId: string;
  evidenceKind:
    | "semantic"
    | "appraisal"
    | "relationship"
    | "memory"
    | "platform_fact";
  confidence: number;
}

interface PlatformActionIntentBase {
  intentId: string;
  kind: PlatformActionDecisionKind;
  serverId: string;
  roomId?: string;
  basedOnEventIds: string[];
  evidence: PlatformActionEvidenceRef[];
  confidence: number;
}

export interface ServerRulesDraftIntent extends PlatformActionIntentBase {
  kind: "server_rules_draft";
  rulesVersionBase: string;
  objective:
    | "initial_server_rules"
    | "revise_server_rules";
  ownerRequested: boolean;
}

export interface ModerationBoundaryIntent extends PlatformActionIntentBase {
  kind: "moderation_boundary_response";
  targetUserId: string;
  severity: number;
  repeatedPattern: boolean;
  reasonCodes: Array<
    | "targeted_insult"
    | "harassment"
    | "threat"
    | "spam"
    | "rule_violation"
    | "other"
  >;
}

export type PlatformActionIntent =
  | ServerRulesDraftIntent
  | ModerationBoundaryIntent;

/**
 * Canonical action-decision input.
 *
 * IMPORTANT: actor-specific PlatformCapabilityGrant is deliberately absent.
 * The decision answers WHAT/WHETHER should happen from evidence. Feasibility
 * is resolved only afterwards.
 */
export interface PlatformActionDecisionInput {
  eventId: string;
  serverId: string;
  roomId?: string;
  actorUserId: string;
  actorRoles: string[];
  rulesVersion: string;
  semanticEvidence: unknown;
  relationshipEvidence: unknown;
  appraisalEvidence: unknown;
  memoryEvidence: unknown;
  platformFacts?: Record<string, unknown>;
}

/**
 * Policy mapping is deterministic and grant-independent. It may select which
 * platform capability class would realize an intent, but it cannot determine
 * whether the current Kaira principal is authorized to use it.
 */
export interface PlatformActionPolicySelection {
  intentId: string;
  requestedCapability: PlatformCapability;
  serverId: string;
  roomId?: string;
  targetUserId?: string;
  policyReason: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function mapPlatformActionIntentToPolicy(
  intent: PlatformActionIntent,
): PlatformActionPolicySelection {
  if (intent.kind === "server_rules_draft") {
    return {
      intentId: intent.intentId,
      requestedCapability: "server.rules.propose",
      serverId: intent.serverId,
      roomId: intent.roomId,
      policyReason: intent.objective,
    };
  }

  const severity = clamp01(intent.severity);
  const requestedCapability: PlatformCapability =
    severity < 0.25
      ? "member.warn"
      : severity < 0.55
        ? "member.timeout"
        : severity < 0.8
          ? "member.kick"
          : "member.ban";

  return {
    intentId: intent.intentId,
    requestedCapability,
    serverId: intent.serverId,
    roomId: intent.roomId,
    targetUserId: intent.targetUserId,
    policyReason: `moderation_severity_${severity.toFixed(2)}`,
  };
}
