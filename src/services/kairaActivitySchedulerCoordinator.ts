import {
  createKairaActivityScheduleAtomic,
  loadKairaActivitySchedule,
  commitKairaActivityScheduleDispatchAtomic,
  cancelKairaActivityScheduleAtomic,
  type KairaActivityScheduleCreateResult,
  type KairaActivityScheduleDispatchCommitResult,
} from "./kairaActivityScheduleStore";
import { evaluateKairaActivitySchedule } from "./kairaActivitySchedule";
import {
  applyKairaActivityExecutionCommand,
  planKairaActivityExecution,
  type KairaActivityPlanInput,
  type KairaActivityPlanResult,
} from "./kairaActivityExecutionCoordinator";

export interface KairaScheduledActivityPlanInput extends KairaActivityPlanInput {
  notBefore: string;
  expiresAt?: string;
}

export interface KairaScheduledActivityPlanResult {
  execution: KairaActivityPlanResult;
  schedule: KairaActivityScheduleCreateResult;
}

/**
 * Creates canonical process state first, then the schedule trigger. Retry is safe:
 * both layers have deterministic idempotency. The schedule never owns execution state.
 */
export async function scheduleKairaActivityExecution(
  input: KairaScheduledActivityPlanInput,
): Promise<KairaScheduledActivityPlanResult> {
  const execution = await planKairaActivityExecution(input);
  const schedule = await createKairaActivityScheduleAtomic({
    ownerUserId: execution.execution.ownerUserId,
    kairaInstanceId: execution.execution.kairaInstanceId,
    instanceType: execution.execution.instanceType,
    activityId: execution.execution.activityId,
    notBefore: input.notBefore,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    now: input.now,
  });
  return { execution, schedule };
}

export type KairaActivityScheduleDispatchResult =
  | { status: "not_found" }
  | { status: "not_due" | "cancelled" | "expired" | "already_dispatched"; schedule: NonNullable<Awaited<ReturnType<typeof loadKairaActivitySchedule>>> }
  | {
      status: "blocked";
      reason: string;
      schedule: NonNullable<Awaited<ReturnType<typeof loadKairaActivitySchedule>>>;
      execution: Awaited<ReturnType<typeof applyKairaActivityExecutionCommand>>["execution"];
    }
  | {
      status: "dispatched" | "replayed";
      scheduleCommit: KairaActivityScheduleDispatchCommitResult;
      execution: Awaited<ReturnType<typeof applyKairaActivityExecutionCommand>>;
    };

/**
 * Pure scheduler/executor boundary. `now` is supplied by the trusted worker;
 * no hidden timers live here. Permission and lifecycle legality remain executor-owned.
 */
export async function dispatchKairaActivitySchedule(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  now: string;
}): Promise<KairaActivityScheduleDispatchResult> {
  const schedule = await loadKairaActivitySchedule(input);
  if (!schedule) return { status: "not_found" };

  const evaluation = evaluateKairaActivitySchedule(schedule, input.now);
  if (evaluation.status === "not_due") return { status: "not_due", schedule };
  if (evaluation.status === "cancelled") return { status: "cancelled", schedule };
  if (evaluation.status === "already_dispatched") return { status: "already_dispatched", schedule };
  if (evaluation.status === "expired") {
    const commit = await commitKairaActivityScheduleDispatchAtomic(input);
    return { status: "expired", schedule: commit.record };
  }

  const execution = await applyKairaActivityExecutionCommand({
    ownerUserId: schedule.ownerUserId,
    kairaInstanceId: schedule.kairaInstanceId,
    activityId: schedule.activityId,
    command: { type: "start", authority: "kaira_activity_executor" },
    now: input.now,
  });

  if (execution.execution.status === "rejected") {
    const record = execution.execution.record;
    const terminal = record.phase === "completed" || record.phase === "cancelled" || record.phase === "failed";
    const permissionDenied = record.permissionStatus === "denied";
    if (terminal || permissionDenied) {
      const cancelled = await cancelKairaActivityScheduleAtomic(input);
      return {
        status: "blocked",
        reason: terminal ? `execution_terminal:${record.phase}` : "permission_denied",
        schedule: cancelled,
        execution: execution.execution,
      };
    }
    return {
      status: "blocked",
      reason: execution.execution.reason,
      schedule,
      execution: execution.execution,
    };
  }

  const scheduleCommit = await commitKairaActivityScheduleDispatchAtomic(input);
  if (scheduleCommit.status !== "dispatched" && scheduleCommit.status !== "replayed") {
    throw new Error(`Kaira schedule dispatch commit diverged after executor start: ${scheduleCommit.status}`);
  }
  return {
    status: scheduleCommit.status,
    scheduleCommit,
    execution,
  };
}
