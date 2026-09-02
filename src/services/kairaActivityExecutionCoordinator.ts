import {
  createKairaActivityExecutionAtomic,
  applyKairaActivityExecutionCommandAtomic,
  type KairaActivityExecutionCommandResult,
} from "./kairaActivityExecutionStore";
import type {
  KairaActivityExecutionCommand,
  KairaActivityExecutionExperienceSubject,
  KairaActivityExecutionRecord,
  KairaActivityPermissionPolicy,
} from "./kairaActivityExecution";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import {
  saveKairaActivityWorldObservation,
  type WorldEventObservation,
} from "./worldModelEventStore";
import {
  recordCompletedKairaActivityExperience,
  type KairaCompletedActivityExperienceResult,
} from "./kairaActivityExperienceCoordinator";
import type { KairaActivityOutcomeAppraisal } from "./kairaActivityExperienceReceipt";
import { enqueueKairaActivityPlanningTriggerAtomic } from "./kairaActivityPlanningTriggerInboxStore";

const activitySessionId = (activityId: string) => `activity:${activityId}`;

export interface KairaActivityPlanInput {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  activityType: string;
  experienceSubject?: KairaActivityExecutionExperienceSubject;
  permissionPolicy?: KairaActivityPermissionPolicy;
  now: string;
}

export interface KairaActivityPlanResult {
  executionStatus: "created" | "existing";
  execution: Awaited<ReturnType<typeof createKairaActivityExecutionAtomic>>["record"];
  worldObservation: WorldEventObservation;
}

export async function planKairaActivityExecution(
  input: KairaActivityPlanInput,
): Promise<KairaActivityPlanResult> {
  const execution = await createKairaActivityExecutionAtomic(input);
  const record = execution.record;
  const worldObservation = await saveKairaActivityWorldObservation({
    userId: record.ownerUserId,
    kairaInstanceId: record.kairaInstanceId,
    sessionId: activitySessionId(record.activityId),
    activity: {
      activityId: record.activityId,
      activityType: record.activityType,
      status: "planned",
      ...(record.experienceSubject ? { experienceSubject: { ...record.experienceSubject } } : {}),
    },
  });
  return {
    executionStatus: execution.status,
    execution: record,
    worldObservation,
  };
}

export interface KairaActivityExecutionCommandInput {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  command: KairaActivityExecutionCommand;
  now: string;
  /** Only meaningful for a completed activity. World completion does not depend on its presence. */
  outcome?: KairaActivityOutcomeAppraisal;
}

export interface KairaActivityExecutionCommandCoordinatorResult {
  execution: KairaActivityExecutionCommandResult;
  worldObservation?: WorldEventObservation;
  completedExperience?: KairaCompletedActivityExperienceResult;
  planningTriggerInbox?: Awaited<ReturnType<typeof enqueueKairaActivityPlanningTriggerAtomic>>;
}

function terminalPlanningTrigger(record: KairaActivityExecutionRecord) {
  if (record.phase !== "completed" && record.phase !== "cancelled" && record.phase !== "failed") return null;
  const occurredAt = record.phase === "completed" && record.completedAt
    ? record.completedAt
    : record.updatedAt;
  return {
    triggerId: `execution_terminal:${record.activityId}:${record.phase}`,
    kind: "execution_terminal" as const,
    sourceId: `activity:${record.activityId}`,
    occurredAt,
    terminalPhase: record.phase,
  };
}

async function enqueueTerminalPlanningTrigger(record: KairaActivityExecutionRecord, now: string) {
  const trigger = terminalPlanningTrigger(record);
  if (!trigger) return undefined;
  return enqueueKairaActivityPlanningTriggerAtomic({
    ownerUserId: record.ownerUserId,
    kairaInstanceId: record.kairaInstanceId,
    instanceType: record.instanceType,
    trigger,
    now,
  });
}

export async function applyKairaActivityExecutionCommand(
  input: KairaActivityExecutionCommandInput,
): Promise<KairaActivityExecutionCommandCoordinatorResult> {
  const execution = await applyKairaActivityExecutionCommandAtomic({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    activityId: input.activityId,
    command: input.command,
    now: input.now,
  });
  if (execution.status === "rejected") return { execution };

  const record = execution.record;
  if (input.command.type === "grant_permission" || input.command.type === "deny_permission") {
    return { execution };
  }

  if (input.command.type === "complete" && input.outcome) {
    const completedExperience = await recordCompletedKairaActivityExperience({
      authority: "kaira_activity_executor",
      userId: record.ownerUserId,
      kairaInstanceId: record.kairaInstanceId,
      instanceType: record.instanceType,
      sessionId: activitySessionId(record.activityId),
      activityId: record.activityId,
      activityType: record.activityType,
      ...(record.experienceSubject ? { experienceSubject: { ...record.experienceSubject } } : {}),
      outcome: { ...input.outcome },
    });
    const planningTriggerInbox = await enqueueTerminalPlanningTrigger(record, input.now);
    return {
      execution,
      worldObservation: completedExperience.observation,
      completedExperience,
      ...(planningTriggerInbox ? { planningTriggerInbox } : {}),
    };
  }

  const status =
    input.command.type === "start"
      ? "active"
      : input.command.type === "complete"
        ? "completed"
        : input.command.type === "cancel"
          ? "cancelled"
          : "failed";
  const worldObservation = await saveKairaActivityWorldObservation({
    userId: record.ownerUserId,
    kairaInstanceId: record.kairaInstanceId,
    sessionId: activitySessionId(record.activityId),
    activity: {
      activityId: record.activityId,
      activityType: record.activityType,
      status,
      ...(record.experienceSubject ? { experienceSubject: { ...record.experienceSubject } } : {}),
    },
  });
  const planningTriggerInbox = await enqueueTerminalPlanningTrigger(record, input.now);
  return {
    execution,
    worldObservation,
    ...(planningTriggerInbox ? { planningTriggerInbox } : {}),
  };
}
