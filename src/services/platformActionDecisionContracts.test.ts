import { describe, expect, it } from "vitest";
import {
  mapPlatformActionIntentToPolicy,
  type ModerationBoundaryIntent,
  type PlatformActionDecisionInput,
  type ServerRulesDraftIntent,
} from "./platformActionDecision";
import {
  buildPlatformActionFeasibilityRequest,
  realizePlatformActionProposal,
} from "./platformActionRealizer";
import {
  assertPlatformActionExecutionClaim,
  canAssertPlatformActionExecuted,
} from "./platformActionClaimGuard";
import {
  PRIVATROOM_PLATFORM_CONTRACT_VERSION,
  type PlatformActionFeasibilityResultV1,
  type PlatformActionResultV1,
} from "../integrations/privatroom/platformContracts";

describe("platform action decision boundary", () => {
  it("keeps actor-specific capability grants out of canonical decision input", () => {
    type HasCapabilities = "capabilities" extends keyof PlatformActionDecisionInput ? true : false;
    type HasCapabilityGrants = "capabilityGrants" extends keyof PlatformActionDecisionInput ? true : false;
    const hasCapabilities: HasCapabilities = false;
    const hasCapabilityGrants: HasCapabilityGrants = false;

    expect(hasCapabilities).toBe(false);
    expect(hasCapabilityGrants).toBe(false);
  });

  it("maps a rules intent to capability policy without consulting grants", () => {
    const intent: ServerRulesDraftIntent = {
      intentId: "intent_rules_1",
      kind: "server_rules_draft",
      serverId: "server_1",
      roomId: "room_main",
      basedOnEventIds: ["evt_1"],
      evidence: [
        {
          eventId: "evt_1",
          evidenceKind: "semantic",
          confidence: 0.96,
        },
      ],
      confidence: 0.94,
      rulesVersionBase: "rules_v3",
      objective: "initial_server_rules",
      ownerRequested: true,
    };

    const selection = mapPlatformActionIntentToPolicy(intent);
    expect(selection.requestedCapability).toBe("server.rules.propose");

    const request = buildPlatformActionFeasibilityRequest(selection, 1_700_000_000_000);
    expect(request.requestedCapability).toBe("server.rules.propose");
    expect(request.intentId).toBe(intent.intentId);
  });

  it("maps moderation severity through one policy scale instead of action-specific decision branches", () => {
    const base: Omit<ModerationBoundaryIntent, "severity"> = {
      intentId: "intent_mod_1",
      kind: "moderation_boundary_response",
      serverId: "server_1",
      roomId: "room_main",
      targetUserId: "user_2",
      repeatedPattern: false,
      reasonCodes: ["targeted_insult"],
      basedOnEventIds: ["evt_1"],
      evidence: [
        {
          eventId: "evt_1",
          evidenceKind: "appraisal",
          confidence: 0.9,
        },
      ],
      confidence: 0.9,
    };

    expect(mapPlatformActionIntentToPolicy({ ...base, severity: 0.1 }).requestedCapability).toBe("member.warn");
    expect(mapPlatformActionIntentToPolicy({ ...base, severity: 0.4 }).requestedCapability).toBe("member.timeout");
    expect(mapPlatformActionIntentToPolicy({ ...base, severity: 0.7 }).requestedCapability).toBe("member.kick");
    expect(mapPlatformActionIntentToPolicy({ ...base, severity: 0.95 }).requestedCapability).toBe("member.ban");
  });

  it("realizer cannot exceed intent confidence and must honor feasibility constraints", () => {
    const intent: ModerationBoundaryIntent = {
      intentId: "intent_mod_2",
      kind: "moderation_boundary_response",
      serverId: "server_1",
      roomId: "room_main",
      targetUserId: "user_2",
      severity: 0.6,
      repeatedPattern: true,
      reasonCodes: ["harassment"],
      basedOnEventIds: ["evt_2"],
      evidence: [
        {
          eventId: "evt_2",
          evidenceKind: "relationship",
          confidence: 0.8,
        },
      ],
      confidence: 0.82,
    };
    const selection = mapPlatformActionIntentToPolicy(intent);
    expect(selection.requestedCapability).toBe("member.timeout");

    const feasibility: PlatformActionFeasibilityResultV1 = {
      contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
      requestId: "feasibility_intent_mod_2",
      intentId: intent.intentId,
      requestedCapability: "member.timeout",
      status: "approval_required",
      matchedGrantId: "grant_timeout",
      mode: "owner_approval",
      constraints: { maxTimeoutMs: 10 * 60_000 },
      checkedAt: 1_700_000_100_000,
    };

    const proposal = realizePlatformActionProposal({
      intent,
      selection,
      feasibility,
      actionId: "action_1",
      reasonText: "Tekrarlanan hedefli taciz kanıtı.",
    });

    expect(proposal.type).toBe("member.timeout");
    if (proposal.type !== "member.timeout") throw new Error("wrong proposal type");
    expect(proposal.durationMs).toBeLessThanOrEqual(10 * 60_000);
    expect(proposal.confidence).toBe(intent.confidence);
    expect(proposal.serverId).toBe(intent.serverId);
    expect(proposal.roomId).toBe(intent.roomId);
  });

  it("blocks completion claims until a matching executed receipt exists", () => {
    const pending: PlatformActionResultV1 = {
      contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
      actionId: "action_1",
      status: "approval_required",
      approvalId: "approval_1",
    };
    const executed: PlatformActionResultV1 = {
      contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
      actionId: "action_1",
      status: "executed",
      executedAt: 1_700_000_200_000,
    };

    expect(canAssertPlatformActionExecuted("action_1", [pending])).toBe(false);
    expect(() => assertPlatformActionExecutionClaim("action_1", [pending])).toThrow(
      "platform_action_execution_claim_without_receipt",
    );
    expect(canAssertPlatformActionExecuted("action_1", [pending, executed])).toBe(true);
    expect(() => assertPlatformActionExecutionClaim("action_1", [pending, executed])).not.toThrow();
  });
});
