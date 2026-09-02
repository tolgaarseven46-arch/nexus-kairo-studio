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
 * One trusted autonomous-life tick. Stages are deliberately isolated: proposal
 * recovery failure must not prevent already-canonical due schedules from running,
 * and a scheduler discovery failure must not roll back proposal recovery.
 * Each underlying authority remains idempotent/retry-safe.
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

  const proposalRecovery = await runStage(() => runKairaProposalRecoveryWorker({
    runId: `${runId}:proposal-recovery`,
    requestedLimit: input.requestedLimit,
    now,
  }));
  const scheduleDispatch = await runStage(() => dispatchDueKairaActivitySchedules({
    now,
    batchSize: input.requestedLimit,
  }));

  const proposalFailed = proposalRecovery.status === "failed" || proposalRecovery.result?.status === "failed";
  const scheduleFailed = scheduleDispatch.status === "failed";
  const status = proposalFailed && scheduleFailed
    ? "failed"
    : proposalFailed || scheduleFailed
      ? "partial_failure"
      : "completed";

  return {
    status,
    runId,
    processedAt: now,
    proposalRecovery,
    scheduleDispatch,
  };
}
