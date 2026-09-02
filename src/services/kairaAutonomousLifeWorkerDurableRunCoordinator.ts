import {
  runKairaAutonomousLifeWorker,
  type KairaAutonomousLifeWorkerRunResult,
} from "./kairaAutonomousLifeWorkerRunCoordinator";
import {
  claimKairaAutonomousLifeWorkerRun,
  completeKairaAutonomousLifeWorkerRun,
  failKairaAutonomousLifeWorkerRun,
  type KairaAutonomousLifeWorkerRunReceipt,
  type KairaAutonomousLifeWorkerRunSummary,
} from "./kairaAutonomousLifeWorkerRunStore";

export type KairaAutonomousLifeWorkerDurableRunResult =
  | { status: "busy"; receipt: KairaAutonomousLifeWorkerRunReceipt }
  | { status: "replayed"; receipt: KairaAutonomousLifeWorkerRunReceipt }
  | {
      status: "executed";
      receipt: KairaAutonomousLifeWorkerRunReceipt;
      worker: KairaAutonomousLifeWorkerRunResult;
    }
  | {
      status: "failed";
      receipt: KairaAutonomousLifeWorkerRunReceipt;
      error: string;
    };

const finiteCount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

function compactSummary(result: KairaAutonomousLifeWorkerRunResult): KairaAutonomousLifeWorkerRunSummary {
  const planning = result.planningInbox.result;
  const recovery = result.proposalRecovery.result;
  const recoveryBatch = recovery && "batch" in recovery ? recovery.batch : undefined;
  const schedules = result.scheduleDispatch.result;
  return {
    outcome: result.status,
    planning: {
      status: result.planningInbox.status,
      discovered: finiteCount(planning?.discovered),
      completed: finiteCount(planning?.completed),
      busy: finiteCount(planning?.busy),
      deferred: finiteCount(planning?.deferred),
      failed: finiteCount(planning?.failed),
      ...(result.planningInbox.error ? { error: result.planningInbox.error.slice(0, 500) } : {}),
    },
    recovery: {
      status: result.proposalRecovery.status,
      ...(recovery?.status ? { outcome: recovery.status } : {}),
      discovered: finiteCount(recoveryBatch?.discovered),
      processed: finiteCount(recoveryBatch?.processed),
      failed: finiteCount(recoveryBatch?.failed),
      ...(result.proposalRecovery.error ? { error: result.proposalRecovery.error.slice(0, 500) } : {}),
    },
    schedules: {
      status: result.scheduleDispatch.status,
      discovered: finiteCount(schedules?.discovered),
      attempted: finiteCount(schedules?.attempted),
      succeeded: finiteCount(schedules?.succeeded),
      failed: finiteCount(schedules?.failed),
      ...(result.scheduleDispatch.error ? { error: result.scheduleDispatch.error.slice(0, 500) } : {}),
    },
  };
}

/**
 * Durable idempotency boundary for the complete autonomous-life tick. Sub-stages
 * remain independently retry-safe, while the stable wakeup run id prevents a
 * concurrent scheduler retry from executing the whole pipeline twice.
 */
export async function runKairaAutonomousLifeWorkerDurable(input: {
  runId: string;
  requestedLimit: number;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaAutonomousLifeWorkerDurableRunResult> {
  const claim = await claimKairaAutonomousLifeWorkerRun(input);
  if (claim.status === "busy" || claim.status === "replayed") {
    return { status: claim.status, receipt: claim.receipt };
  }
  try {
    const worker = await runKairaAutonomousLifeWorker(input);
    const receipt = await completeKairaAutonomousLifeWorkerRun({
      runId: input.runId,
      requestedLimit: input.requestedLimit,
      now: worker.processedAt,
      summary: compactSummary(worker),
    });
    return { status: "executed", receipt, worker };
  } catch (error) {
    const message = error instanceof Error ? error.message : "autonomous_life_worker_failed";
    const receipt = await failKairaAutonomousLifeWorkerRun({
      runId: input.runId,
      requestedLimit: input.requestedLimit,
      now: input.now,
      failure: message,
    });
    return { status: "failed", receipt, error: message };
  }
}
