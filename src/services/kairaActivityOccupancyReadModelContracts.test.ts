import { beforeEach, describe, expect, it, vi } from "vitest";

const executions = vi.hoisted(() => ({ list: vi.fn() }));
const schedules = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("./kairaActivityExecutionStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivityExecutionStore")>();
  return { ...actual, listOpenKairaActivityExecutions: executions.list };
});
vi.mock("./kairaActivityScheduleStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivityScheduleStore")>();
  return { ...actual, listScheduledKairaActivitySchedulesForInstance: schedules.list };
});

import { readKairaActivityOccupancySnapshot } from "./kairaActivityOccupancyReadModel";

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity occupancy read-model contracts", () => {
  it("reads open execution and scheduled work from canonical instance-scoped stores", async () => {
    executions.list.mockResolvedValue([{ activityId: "active_a", phase: "active" }]);
    schedules.list.mockResolvedValue([{ activityId: "scheduled_a", status: "scheduled" }]);

    const result = await readKairaActivityOccupancySnapshot({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      executionBatchSize: 30,
      scheduleBatchSize: 40,
    });

    expect(executions.list).toHaveBeenCalledWith({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      batchSize: 30,
    });
    expect(schedules.list).toHaveBeenCalledWith({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      batchSize: 40,
    });
    expect(result).toEqual({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      openExecutions: [{ activityId: "active_a", phase: "active" }],
      scheduledActivities: [{ activityId: "scheduled_a", status: "scheduled" }],
    });
  });

  it("does not substitute synthetic occupancy if one canonical store fails", async () => {
    executions.list.mockRejectedValue(new Error("execution store unavailable"));
    schedules.list.mockResolvedValue([]);

    await expect(readKairaActivityOccupancySnapshot({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
    })).rejects.toThrow("execution store unavailable");
  });
});
