import {
  listPendingKairaActivityPlanningTriggers,
  markKairaActivityPlanningTriggerConsumedAtomic,
  markKairaActivityPlanningTriggerDeferredAtomic,
  type KairaActivityPlanningTriggerInboxRecord,
} from "./kairaActivityPlanningTriggerInboxStore";
import { readKairaActivityPlanningSourceSnapshot } from "./kairaActivityPlanningSourceSnapshot";
import { evaluateAndCommitKairaActivityPlanningTrigger } from "./kairaActivityPlanningCommitCoordinator";

export interface KairaActivityPlanningInboxItemResult {
  triggerId: string;
  status: "completed" | "busy" | "deferred" | "failed";
  outcome?: string;
  reason?: string;
  error?: string;
}

export interface KairaActivityPlanningInboxBatchResult {
  discovered: number;
  completed: number;
  busy: number;
  deferred: number;
  failed: number;
  items: KairaActivityPlanningInboxItemResult[];
}

async function processRecord(
  record: KairaActivityPlanningTriggerInboxRecord,
  now: string,
  occupancyBatchSize?: number,
): Promise<KairaActivityPlanningInboxItemResult> {
  try {
    const sources = await readKairaActivityPlanningSourceSnapshot({
      record,
      ...(occupancyBatchSize !== undefined ? { occupancyBatchSize } : {}),
    });
    if (sources.status === "unavailable") {
      await markKairaActivityPlanningTriggerDeferredAtomic({ record, now });
      return {
        triggerId: record.trigger.triggerId,
        status: "deferred",
        reason: sources.reason,
      };
    }
    const result = await evaluateAndCommitKairaActivityPlanningTrigger({
      ownerUserId: record.ownerUserId,
      kairaInstanceId: record.kairaInstanceId,
      instanceType: record.instanceType,
      trigger: record.trigger,
      catalog: sources.catalog,
      environment: sources.environment,
      activeExecutions: sources.activeExecutions,
      schedules: sources.schedules,
      dynamicState: sources.dynamicState,
      now,
    });
    if (result.status === "busy") {
      return { triggerId: record.trigger.triggerId, status: "busy", outcome: result.status };
    }
    await markKairaActivityPlanningTriggerConsumedAtomic({ record, now });
    return {
      triggerId: record.trigger.triggerId,
      status: "completed",
      outcome: result.status,
    };
  } catch (error) {
    return {
      triggerId: record.trigger.triggerId,
      status: "failed",
      error: error instanceof Error ? error.message : "planning_trigger_processing_failed",
    };
  }
}

/**
 * Query-backed worker stage. Deferred work is given a persisted retry window so
 * missing source facts cannot occupy every bounded batch and starve unrelated
 * Kaira planning work. Items remain isolated and retry-safe.
 */
export async function processPendingKairaActivityPlanningTriggers(input: {
  now: string;
  batchSize?: number;
  occupancyBatchSize?: number;
}): Promise<KairaActivityPlanningInboxBatchResult> {
  const records = await listPendingKairaActivityPlanningTriggers({
    now: input.now,
    ...(input.batchSize !== undefined ? { batchSize: input.batchSize } : {}),
  });
  const items: KairaActivityPlanningInboxItemResult[] = [];
  for (const record of records) {
    items.push(await processRecord(record, input.now, input.occupancyBatchSize));
  }
  return {
    discovered: records.length,
    completed: items.filter((item) => item.status === "completed").length,
    busy: items.filter((item) => item.status === "busy").length,
    deferred: items.filter((item) => item.status === "deferred").length,
    failed: items.filter((item) => item.status === "failed").length,
    items,
  };
}
