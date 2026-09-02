import {
  processPendingKairaActivityPlanningTriggers,
  type KairaActivityPlanningInboxBatchResult,
} from "./kairaActivityPlanningTriggerInboxProcessor";
import {
  runKairaProposalRecoveryWorker,
  type KairaProposalRecoveryWorkerRunResult,
} from "./kairaProposalRecoveryWorkerRunCoordinator";
import {
  dispatchDueKairaActivitySchedules,
  type KairaActivityScheduleDispatchDiscoveryResult,
} from "./kairaActivityScheduleDispatchDiscovery";

export type KairaAutonomousLifeWorkerStageStatus = "completed" | "failed";

export interface KairaAutonomousLifeWorkerStage<T> {
  status: KairaAutonomousLifeWorkerStageStatus;
  result?: T;
  error?: string;
}

export interface KairaAutonomousLifeWorkerRunResult {
  status: "completed" | "partial_failure" | "failed";
  runId: string;
  processedAt: string;
  planningInbox: KairaAutonomousLifeWorkerStage<KairaActivityPlanningInboxBatchResult>;
  proposalRecovery: KairaAutonomousLifeWorkerStage<KairaProposalRecoveryWorkerRunResult>;
  scheduleDispatch: KairaAutonomousLifeWorkerStage<KairaActivityScheduleDispatchDiscoveryResult>;
}

async function runStage<T>(operation: () => Promise<T>): Promise<KairaAutonomousLifeWorkerStage<T>> {
  try {
    return { status: "completed", result: await operation() };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * One trusted autonomous-life tick. Planning delivery runs first so newly durable
 * proposals may be recovered in the same tick; all stages remain isolated and
 * retry-safe so one authority failure cannot block already-canonical work.
 */
export async function runKairaAutonomousLifeWorker(input: {
  runId: string;
  requestedLimit: number;
  now: string;
}): Promise<KairaAutonomousLifeWorkerRunResult> {
  const runId = String(input.runId || "").trim();
  const nowMs = Date.parse(input.now);
  if (!runId) throw new Error("Kaira autonomous life worker run id required");
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira autonomous life worker time");
  const now = new Date(nowMs).toISOString();

  const planningInbox = await runStage(() => processPendingKairaActivityPlanningTriggers({
    now,
    batchSize: input.requestedLimit,
    occupancyBatchSize: input.requestedLimit,
  }));
  const proposalRecovery = await runStage(() => runKairaProposalRecoveryWorker({
    runId: `${runId}:proposal-recovery`,
    requestedLimit: input.requestedLimit,
    now,
  }));
  const scheduleDispatch = await runStage(() => dispatchDueKairaActivitySchedules({
    now,
    batchSize: input.requestedLimit,
  }));

  const planningFailed = planningInbox.status === "failed" || (planningInbox.result?.failed || 0) > 0;
  const proposalFailed = proposalRecovery.status === "failed" || proposalRecovery.result?.status === "failed";
  const scheduleFailed = scheduleDispatch.status === "failed" || (scheduleDispatch.result?.failed || 0) > 0;
  const failureCount = [planningFailed, proposalFailed, scheduleFailed].filter(Boolean).length;
  const status = failureCount === 3
    ? "failed"
    : failureCount > 0
      ? "partial_failure"
      : "completed";

  return {
    status,
    runId,
    processedAt: now,
    planningInbox,
    proposalRecovery,
    scheduleDispatch,
  };
}
