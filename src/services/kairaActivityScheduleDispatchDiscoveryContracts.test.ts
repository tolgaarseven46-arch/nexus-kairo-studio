import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ listDue: vi.fn() }));
const scheduler = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("./kairaActivityScheduleStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivityScheduleStore")>();
  return { ...actual, listDueKairaActivitySchedules: store.listDue };
});
vi.mock("./kairaActivitySchedulerCoordinator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivitySchedulerCoordinator")>();
  return { ...actual, dispatchKairaActivitySchedule: scheduler.dispatch };
});

import { dispatchDueKairaActivitySchedules } from "./kairaActivityScheduleDispatchDiscovery";

const schedule = (activityId: string) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activityId,
  notBefore: "2026-09-02T01:00:00.000Z",
  status: "scheduled" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira due schedule dispatch discovery contracts", () => {
  it("discovers due canonical schedules and dispatches them through the scheduler authority", async () => {
    store.listDue.mockResolvedValue([schedule("activity_a")]);
    scheduler.dispatch.mockResolvedValue({ status: "dispatched" });

    const result = await dispatchDueKairaActivitySchedules({
      now: "2026-09-02T01:05:00.000Z",
      batchSize: 10,
    });

    expect(store.listDue).toHaveBeenCalledWith({
      now: "2026-09-02T01:05:00.000Z",
      batchSize: 10,
    });
    expect(scheduler.dispatch).toHaveBeenCalledWith({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "activity_a",
      now: "2026-09-02T01:05:00.000Z",
    });
    expect(result).toMatchObject({ discovered: 1, attempted: 1, succeeded: 1, failed: 0 });
  });

  it("isolates one failed dispatch so later due schedules still run", async () => {
    store.listDue.mockResolvedValue([schedule("activity_a"), schedule("activity_b")]);
    scheduler.dispatch
      .mockRejectedValueOnce(new Error("execution conflict"))
      .mockResolvedValueOnce({ status: "dispatched" });

    const result = await dispatchDueKairaActivitySchedules({ now: "2026-09-02T01:05:00Z" });

    expect(scheduler.dispatch).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ discovered: 2, attempted: 2, succeeded: 1, failed: 1 });
    expect(result.items[0]).toMatchObject({ error: "execution conflict" });
    expect(result.items[1].result).toMatchObject({ status: "dispatched" });
  });

  it("rejects invalid worker time before discovery", async () => {
    await expect(dispatchDueKairaActivitySchedules({ now: "bad-time" })).rejects.toThrow("worker time");
    expect(store.listDue).not.toHaveBeenCalled();
  });
});
