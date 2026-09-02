import { instancePolicy, resolveKairaInstanceContext, type KairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";

export type KairaActivityPlanningTrigger =
  | {
      triggerId: string;
      kind: "idle_transition";
      sourceId: string;
      occurredAt: string;
      previousBusy: boolean;
      currentBusy: false;
    }
  | {
      triggerId: string;
      kind: "execution_terminal";
      sourceId: string;
      occurredAt: string;
      terminalPhase: "completed" | "cancelled" | "failed";
    }
  | {
      triggerId: string;
      kind: "meaningful_world_change";
      sourceId: string;
      occurredAt: string;
      materiality: number;
    }
  | {
      triggerId: string;
      kind: "dynamic_state_change";
      sourceId: string;
      occurredAt: string;
      magnitude: number;
    };

export interface KairaActivityPlanningTriggerContext {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  activeExecutions: KairaActivityExecutionRecord[];
  schedules: KairaActivityScheduleRecord[];
  now: string;
  lastPlanningEvaluationAt?: string;
  cooldownMinutes?: number;
  upcomingScheduleBlockMinutes?: number;
}

export type KairaActivityPlanningTriggerDecision =
  | {
      status: "evaluate";
      trigger: KairaActivityPlanningTrigger;
      evidenceIds: string[];
    }
  | {
      status: "suppressed";
      reason:
        | "autonomous_activity_planning_disabled"
        | "invalid_or_future_trigger"
        | "non_material_trigger"
        | "active_execution"
        | "upcoming_schedule"
        | "planning_cooldown";
      trigger: KairaActivityPlanningTrigger;
      evidenceIds: string[];
    };

const key = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

const finiteUnit = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export function normalizeKairaActivityPlanningTrigger(
  trigger: KairaActivityPlanningTrigger,
): KairaActivityPlanningTrigger {
  const triggerId = key(trigger.triggerId);
  const sourceId = key(trigger.sourceId);
  const occurredAtMs = Date.parse(trigger.occurredAt);
  if (!triggerId || !sourceId || !Number.isFinite(occurredAtMs)) {
    throw new Error("Invalid Kaira activity planning trigger");
  }
  if (trigger.kind === "meaningful_world_change" && !finiteUnit(trigger.materiality)) {
    throw new Error("Invalid Kaira activity planning trigger materiality");
  }
  if (trigger.kind === "dynamic_state_change" && !finiteUnit(trigger.magnitude)) {
    throw new Error("Invalid Kaira activity planning trigger magnitude");
  }
  return { ...trigger, triggerId, sourceId, occurredAt: new Date(occurredAtMs).toISOString() } as KairaActivityPlanningTrigger;
}

function nonMaterial(trigger: KairaActivityPlanningTrigger): boolean {
  if (trigger.kind === "idle_transition") return trigger.previousBusy !== true;
  if (trigger.kind === "meaningful_world_change") return trigger.materiality < 0.35;
  if (trigger.kind === "dynamic_state_change") return trigger.magnitude < 0.3;
  return false;
}

/**
 * Canonical policy for deciding whether an upstream lifecycle/state/world signal
 * is allowed to start a new autonomous planning evaluation. It does not create
 * candidates, mutate stores, schedule work, or parse dialogue text.
 */
export function evaluateKairaActivityPlanningTrigger(
  input: KairaActivityPlanningTriggerContext,
): KairaActivityPlanningTriggerDecision {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  const trigger = normalizeKairaActivityPlanningTrigger(input.trigger);
  const evidenceIds = [
    `planning_trigger:${trigger.kind}`,
    `trigger:${trigger.triggerId}`,
    `source:${trigger.sourceId}`,
  ];
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    return { status: "suppressed", reason: "autonomous_activity_planning_disabled", trigger, evidenceIds };
  }

  const nowMs = Date.parse(input.now);
  const triggerMs = Date.parse(trigger.occurredAt);
  if (!Number.isFinite(nowMs) || triggerMs > nowMs + 60_000 || nowMs - triggerMs > 24 * 60 * 60_000) {
    return { status: "suppressed", reason: "invalid_or_future_trigger", trigger, evidenceIds };
  }
  if (nonMaterial(trigger)) {
    return { status: "suppressed", reason: "non_material_trigger", trigger, evidenceIds };
  }

  if (input.activeExecutions.some((record) => record.phase === "active")) {
    return { status: "suppressed", reason: "active_execution", trigger, evidenceIds };
  }

  const upcomingBlockMinutes = Math.max(1, Math.min(180, input.upcomingScheduleBlockMinutes || 20));
  const hasUpcomingSchedule = input.schedules.some((record) => {
    if (record.status !== "scheduled") return false;
    const dueMs = Date.parse(record.notBefore);
    return Number.isFinite(dueMs) && dueMs >= nowMs && dueMs - nowMs <= upcomingBlockMinutes * 60_000;
  });
  if (hasUpcomingSchedule) {
    return { status: "suppressed", reason: "upcoming_schedule", trigger, evidenceIds };
  }

  const cooldownMinutes = Math.max(1, Math.min(180, input.cooldownMinutes || 15));
  if (input.lastPlanningEvaluationAt) {
    const lastMs = Date.parse(input.lastPlanningEvaluationAt);
    if (Number.isFinite(lastMs) && lastMs <= nowMs && nowMs - lastMs < cooldownMinutes * 60_000) {
      return { status: "suppressed", reason: "planning_cooldown", trigger, evidenceIds };
    }
  }

  return { status: "evaluate", trigger, evidenceIds };
}
