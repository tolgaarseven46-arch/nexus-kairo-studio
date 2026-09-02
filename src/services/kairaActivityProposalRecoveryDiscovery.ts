import { listSelectedKairaActivityProposals } from "./kairaActivityProposalStore";
import {
  recoverKairaActivityProposalMaterialization,
  type KairaActivityProposalRecoveryResult,
} from "./kairaActivityProposalRecoveryCoordinator";

export type KairaActivityProposalRecoveryWorkResult =
  | {
      status: "processed";
      proposalId: string;
      result: KairaActivityProposalRecoveryResult;
    }
  | {
      status: "failed";
      proposalId: string;
      error: string;
    };

export interface KairaActivityProposalRecoveryBatchResult {
  discovered: number;
  processed: number;
  failed: number;
  items: KairaActivityProposalRecoveryWorkResult[];
}

/**
 * Query-backed recovery worker. Discovery is restricted to canonical proposals
 * whose current status is `selected`; per-proposal lease/idempotency remains owned
 * by the recovery coordinator. One failed item never blocks the rest of the batch.
 */
export async function recoverSelectedKairaActivityProposals(input: {
  now: string;
  batchSize?: number;
  leaseMinutes?: number;
}): Promise<KairaActivityProposalRecoveryBatchResult> {
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira proposal recovery worker time");

  const proposals = await listSelectedKairaActivityProposals({ batchSize: input.batchSize });
  const items: KairaActivityProposalRecoveryWorkResult[] = [];

  for (const proposal of proposals) {
    try {
      const result = await recoverKairaActivityProposalMaterialization({
        ownerUserId: proposal.ownerUserId,
        kairaInstanceId: proposal.kairaInstanceId,
        instanceType: proposal.instanceType,
        proposalId: proposal.proposalId,
        now: new Date(nowMs).toISOString(),
        ...(input.leaseMinutes ? { leaseMinutes: input.leaseMinutes } : {}),
      });
      items.push({ status: "processed", proposalId: proposal.proposalId, result });
    } catch (error) {
      items.push({
        status: "failed",
        proposalId: proposal.proposalId,
        error: error instanceof Error ? error.message : "unknown_recovery_error",
      });
    }
  }

  const failed = items.filter((item) => item.status === "failed").length;
  return {
    discovered: proposals.length,
    processed: items.length - failed,
    failed,
    items,
  };
}
