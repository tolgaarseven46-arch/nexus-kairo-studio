import {
  recoverSelectedKairaActivityProposals,
  type KairaActivityProposalRecoveryBatchResult,
} from "./kairaActivityProposalRecoveryDiscovery";
import {
  claimKairaProposalRecoveryWorkerRun,
  completeKairaProposalRecoveryWorkerRun,
  failKairaProposalRecoveryWorkerRun,
  type KairaProposalRecoveryWorkerItemOutcome,
  type KairaProposalRecoveryWorkerRunReceipt,
  type KairaProposalRecoveryWorkerRunSummary,
} from "./kairaProposalRecoveryWorkerRunStore";

export type KairaProposalRecoveryWorkerRunResult =
  | {
      status: "busy" | "replayed";
      receipt: KairaProposalRecoveryWorkerRunReceipt;
    }
  | {
      status: "completed";
      receipt: KairaProposalRecoveryWorkerRunReceipt;
      batch: KairaActivityProposalRecoveryBatchResult;
    }
  | {
      status: "failed";
      receipt: KairaProposalRecoveryWorkerRunReceipt;
      error: string;
    };

function compactSummary(batch: KairaActivityProposalRecoveryBatchResult): KairaProposalRecoveryWorkerRunSummary {
  return {
    discovered: batch.discovered,
    processed: batch.processed,
    failed: batch.failed,
    items: batch.items.map((item) => {
      if (item.status === "failed") {
        return {
          proposalId: item.proposalId,
          outcome: "failed" as const,
          error: item.error.slice(0, 500),
        };
      }
      const outcome = item.result.status as KairaProposalRecoveryWorkerItemOutcome;
      return { proposalId: item.proposalId, outcome };
    }),
  };
}

export async function runKairaProposalRecoveryWorker(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaProposalRecoveryWorkerRunResult> {
  const claim = await claimKairaProposalRecoveryWorkerRun({
    runId: input.runId,
    requestedLimit: input.requestedLimit,
    now: input.now,
    ...(input.leaseMinutes ? { leaseMinutes: input.leaseMinutes } : {}),
  });
  if (claim.status === "busy" || claim.status === "replayed") {
    return { status: claim.status, receipt: claim.receipt };
  }

  try {
    const batch = await recoverSelectedKairaActivityProposals({
      now: input.now,
      batchSize: input.requestedLimit,
    });
    const receipt = await completeKairaProposalRecoveryWorkerRun({
      runId: input.runId,
      requestedLimit: input.requestedLimit,
      now: input.now,
      summary: compactSummary(batch),
    });
    return { status: "completed", receipt, batch };
  } catch (error) {
    const message = error instanceof Error ? error.message : "proposal_recovery_worker_failed";
    const receipt = await failKairaProposalRecoveryWorkerRun({
      runId: input.runId,
      requestedLimit: input.requestedLimit,
      now: input.now,
      failure: message,
    });
    return { status: "failed", receipt, error: message };
  }
}
