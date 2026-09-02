import { listSelectedKairaActivityProposals } from "./kairaActivityProposalStore";
import { listRecentKairaProposalRecoveryWorkerRuns } from "./kairaProposalRecoveryWorkerRunStore";
import {
  evaluateKairaProposalRecoveryWorkerHealth,
  type KairaProposalRecoveryWorkerHealth,
  type KairaProposalRecoveryWorkerHealthThresholds,
} from "./kairaProposalRecoveryWorkerHealthPolicy";

export async function readKairaProposalRecoveryWorkerHealth(input: {
  now: string;
  thresholds: KairaProposalRecoveryWorkerHealthThresholds;
  recentRunLimit?: number;
  backlogSampleLimit?: number;
}): Promise<KairaProposalRecoveryWorkerHealth> {
  const recentRunLimit = Math.max(1, Math.min(100, Math.trunc(input.recentRunLimit || 20)));
  const backlogSampleLimit = Math.max(1, Math.min(100, Math.trunc(input.backlogSampleLimit || 100)));
  const [recentRuns, selected] = await Promise.all([
    listRecentKairaProposalRecoveryWorkerRuns({ limit: recentRunLimit }),
    listSelectedKairaActivityProposals({ batchSize: backlogSampleLimit }),
  ]);
  return evaluateKairaProposalRecoveryWorkerHealth({
    now: input.now,
    recentRuns,
    selectedBacklogSampleCount: selected.length,
    backlogSampleLimit,
    thresholds: input.thresholds,
  });
}
