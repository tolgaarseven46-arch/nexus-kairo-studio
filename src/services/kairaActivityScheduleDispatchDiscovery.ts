import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";
import { listDueKairaActivitySchedules } from "./kairaActivityScheduleStore";
import {
  dispatchKairaActivitySchedule,
  type KairaActivityScheduleDispatchResult,
} from "./kairaActivitySchedulerCoordinator";

export interface KairaActivityScheduleDispatchDiscoveryItem {
  schedule: KairaActivityScheduleRecord;
  result?: KairaActivityScheduleDispatchResult;
  error?: string;
}

export interface KairaActivityScheduleDispatchDiscoveryResult {
  discovered: number;
  attempted: number;
  succeeded: number;
  failed: number;
  items: KairaActivityScheduleDispatchDiscoveryItem[];
}

/**
 * Query-backed worker seam for due autonomous activity schedules.
 * Discovery owns only bounded iteration. Canonical lifecycle, permission checks,
 * executor transition and schedule commit remain in dispatchKairaActivitySchedule.
 * One malformed/conflicting item cannot prevent the rest of the batch from running.
 */
export async function dispatchDueKairaActivitySchedules(input: {
  now: string;
  batchSize?: number;
}): Promise<KairaActivityScheduleDispatchDiscoveryResult> {
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity schedule worker time");
  const now = new Date(nowMs).toISOString();
  const schedules = await listDueKairaActivitySchedules({
    now,
    ...(input.batchSize !== undefined ? { batchSize: input.batchSize } : {}),
  });

  const items: KairaActivityScheduleDispatchDiscoveryItem[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const schedule of schedules) {
    try {
      const result = await dispatchKairaActivitySchedule({
        ownerUserId: schedule.ownerUserId,
        kairaInstanceId: schedule.kairaInstanceId,
        activityId: schedule.activityId,
        now,
      });
      items.push({ schedule, result });
      succeeded += 1;
    } catch (error) {
      items.push({
        schedule,
        error: error instanceof Error ? error.message : String(error),
      });
      failed += 1;
    }
  }

  return {
    discovered: schedules.length,
    attempted: schedules.length,
    succeeded,
    failed,
    items,
  };
}
