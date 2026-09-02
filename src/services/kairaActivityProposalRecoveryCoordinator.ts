import type { KairaInstanceContext } from "./kairaInstanceContext";
import { loadKairaActivityProposal } from "./kairaActivityProposalStore";
import { materializeKairaActivityProposal, type KairaActivityProposalMaterializationResult } from "./kairaActivityProposalCoordinator";
import {
  claimKairaActivityProposalRecovery,
  completeKairaActivityProposalRecovery,
  type KairaActivityProposalRecoveryClaimResult,
  type KairaActivityProposalRecoveryReceipt,
} from "./kairaActivityProposalRecoveryStore";

export type KairaActivityProposalRecoveryResult =
  | {
      status: "busy" | "replayed";
      claim: KairaActivityProposalRecoveryClaimResult;
      receipt: KairaActivityProposalRecoveryReceipt;
    }
  | {
      status: "cancelled" | "already_materialized";
      claim: KairaActivityProposalRecoveryClaimResult;
      receipt: KairaActivityProposalRecoveryReceipt;
    }
  | {
      status: "materialized";
      claim: KairaActivityProposalRecoveryClaimResult;
      receipt: KairaActivityProposalRecoveryReceipt;
      materialization: KairaActivityProposalMaterializationResult;
    };

/**
 * One-proposal recovery seam for a durable selected proposal. Discovery/queueing is
 * intentionally outside this authority. Execution/schedule creation remains owned
 * by materializeKairaActivityProposal and is idempotent across retries.
 */
export async function recoverKairaActivityProposalMaterialization(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  proposalId: string;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaActivityProposalRecoveryResult> {
  const claim = await claimKairaActivityProposalRecovery({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    proposalId: input.proposalId,
    now: input.now,
    ...(input.leaseMinutes ? { leaseMinutes: input.leaseMinutes } : {}),
  });
  if (claim.status === "busy" || claim.status === "replayed") {
    return { status: claim.status, claim, receipt: claim.receipt };
  }

  const proposal = await loadKairaActivityProposal({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    proposalId: input.proposalId,
  });
  if (!proposal) throw new Error("Kaira activity proposal not found for recovery");
  if (proposal.instanceType !== input.instanceType) throw new Error("Kaira activity proposal recovery instance mismatch");

  if (proposal.status === "cancelled") {
    const receipt = await completeKairaActivityProposalRecovery({
      ownerUserId: input.ownerUserId,
      kairaInstanceId: input.kairaInstanceId,
      instanceType: input.instanceType,
      proposalId: input.proposalId,
      now: input.now,
      outcome: "cancelled",
    });
    return { status: "cancelled", claim, receipt };
  }

  if (proposal.status === "materialized") {
    const receipt = await completeKairaActivityProposalRecovery({
      ownerUserId: input.ownerUserId,
      kairaInstanceId: input.kairaInstanceId,
      instanceType: input.instanceType,
      proposalId: input.proposalId,
      now: input.now,
      outcome: "already_materialized",
    });
    return { status: "already_materialized", claim, receipt };
  }

  const materialization = await materializeKairaActivityProposal({ proposal, now: input.now });
  const receipt = await completeKairaActivityProposalRecovery({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    proposalId: input.proposalId,
    now: input.now,
    outcome: "materialized",
  });
  return { status: "materialized", claim, receipt, materialization };
}
