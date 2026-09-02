import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";
import { listOpenKairaActivityExecutions } from "./kairaActivityExecutionStore";
import { listScheduledKairaActivitySchedulesForInstance } from "./kairaActivityScheduleStore";

export interface KairaActivityOccupancySnapshot {
  ownerUserId: string;
  kairaInstanceId: string;
  openExecutions: KairaActivityExecutionRecord[];
  scheduledActivities: KairaActivityScheduleRecord[];
}

/**
 * Canonical occupancy read-model for autonomous planning. It composes only
 * process-owned execution/schedule stores and owns no derived state itself.
 */
export async function readKairaActivityOccupancySnapshot(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  executionBatchSize?: number;
  scheduleBatchSize?: number;
}): Promise<KairaActivityOccupancySnapshot> {
  const [openExecutions, scheduledActivities] = await Promise.all([
    listOpenKairaActivityExecutions({
      ownerUserId: input.ownerUserId,
      kairaInstanceId: input.kairaInstanceId,
      ...(input.executionBatchSize !== undefined ? { batchSize: input.executionBatchSize } : {}),
    }),
    listScheduledKairaActivitySchedulesForInstance({
      ownerUserId: input.ownerUserId,
      kairaInstanceId: input.kairaInstanceId,
      ...(input.scheduleBatchSize !== undefined ? { batchSize: input.scheduleBatchSize } : {}),
    }),
  ]);
  return {
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    openExecutions,
    scheduledActivities,
  };
}
