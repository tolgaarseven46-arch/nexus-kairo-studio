import type { KairaActivityPlanningTriggerInboxRecord } from "./kairaActivityPlanningTriggerInboxStore";
import { loadActiveKairaActivityCatalog } from "./kairaActivityCatalogStore";
import { loadKairaActivityEnvironmentSnapshot } from "./kairaActivityEnvironmentStore";
import { readKairaActivityOccupancySnapshot } from "./kairaActivityOccupancyReadModel";
import { loadKairaActivityDynamicState } from "./kairaActivityDynamicStateStore";

export type KairaActivityPlanningSourceSnapshotResult =
  | {
      status: "ready";
      catalogVersion: string;
      catalog: NonNullable<Awaited<ReturnType<typeof loadActiveKairaActivityCatalog>>>["entries"];
      environment: NonNullable<Awaited<ReturnType<typeof loadKairaActivityEnvironmentSnapshot>>>;
      activeExecutions: Awaited<ReturnType<typeof readKairaActivityOccupancySnapshot>>["openExecutions"];
      schedules: Awaited<ReturnType<typeof readKairaActivityOccupancySnapshot>>["scheduledActivities"];
      dynamicState: NonNullable<Awaited<ReturnType<typeof loadKairaActivityDynamicState>>>["state"];
    }
  | {
      status: "unavailable";
      reason: "catalog_missing" | "environment_missing" | "dynamic_state_missing";
    };

/** Composes canonical authorities without inventing defaults for missing production facts. */
export async function readKairaActivityPlanningSourceSnapshot(input: {
  record: KairaActivityPlanningTriggerInboxRecord;
  occupancyBatchSize?: number;
}): Promise<KairaActivityPlanningSourceSnapshotResult> {
  const [catalog, environment, occupancy, dynamicState] = await Promise.all([
    loadActiveKairaActivityCatalog(),
    loadKairaActivityEnvironmentSnapshot({
      kairaInstanceId: input.record.kairaInstanceId,
      instanceType: input.record.instanceType,
    }),
    readKairaActivityOccupancySnapshot({
      ownerUserId: input.record.ownerUserId,
      kairaInstanceId: input.record.kairaInstanceId,
      ...(input.occupancyBatchSize !== undefined
        ? {
            executionBatchSize: input.occupancyBatchSize,
            scheduleBatchSize: input.occupancyBatchSize,
          }
        : {}),
    }),
    loadKairaActivityDynamicState({ kairaInstanceId: input.record.kairaInstanceId }),
  ]);
  if (!catalog) return { status: "unavailable", reason: "catalog_missing" };
  if (!environment) return { status: "unavailable", reason: "environment_missing" };
  if (!dynamicState) return { status: "unavailable", reason: "dynamic_state_missing" };
  return {
    status: "ready",
    catalogVersion: catalog.catalogVersion,
    catalog: catalog.entries,
    environment,
    activeExecutions: occupancy.openExecutions,
    schedules: occupancy.scheduledActivities,
    dynamicState: dynamicState.state,
  };
}
