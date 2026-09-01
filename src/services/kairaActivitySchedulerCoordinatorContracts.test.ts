import { beforeEach, describe, expect, it, vi } from "vitest";

const schedules = vi.hoisted(() => ({
  create: vi.fn(),
  load: vi.fn(),
  commit: vi.fn(),
  cancel: vi.fn(),
}));
const execution = vi.hoisted(() => ({ plan: vi.fn(), command: vi.fn() }));

vi.mock("./kairaActivityScheduleStore", () => ({
  createKairaActivityScheduleAtomic: schedules.create,
  loadKairaActivitySchedule: schedules.load,
  commitKairaActivityScheduleDispatchAtomic: schedules.commit,
  cancelKairaActivityScheduleAtomic: schedules.cancel,
}));
vi.mock("./kairaActivityExecutionCoordinator", () => ({
  planKairaActivityExecution: execution.plan,
  applyKairaActivityExecutionCommand: execution.command,
}));

import {
  dispatchKairaActivitySchedule,
  scheduleKairaActivityExecution,
} from "./kairaActivitySchedulerCoordinator";

const scheduleRecord = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activityId: "theatre_01",
  notBefore: "2026-09-02T01:00:00.000Z",
  expiresAt: "2026-09-02T02:00:00.000Z",
  status: "scheduled" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  ...overrides,
});

const executionRecord = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activityId: "theatre_01",
  activityType: "theatre",
  phase: "planned" as const,
  permissionPolicy: "none" as const,
  permissionStatus: "not_required" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity scheduler coordinator contracts", () => {
  it("creates process/world plan before creating the schedule trigger", async () => {
    const record = executionRecord();
    execution.plan.mockResolvedValue({
      executionStatus: "created",
      execution: record,
      worldObservation: { id: "obs_planned" },
    });
    schedules.create.mockResolvedValue({ status: "created", record: scheduleRecord() });

    await scheduleKairaActivityExecution({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      activityType: "theatre",
      permissionPolicy: "none",
      notBefore: "2026-09-02T01:00:00.000Z",
      expiresAt: "2026-09-02T02:00:00.000Z",
      now: "2026-09-02T00:00:00.000Z",
    });
    expect(execution.plan.mock.invocationCallOrder[0]).toBeLessThan(schedules.create.mock.invocationCallOrder[0]);
  });

  it("does not call executor before notBefore", async () => {
    schedules.load.mockResolvedValue(scheduleRecord());
    const result = await dispatchKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T00:30:00.000Z",
    });
    expect(result.status).toBe("not_due");
    expect(execution.command).not.toHaveBeenCalled();
    expect(schedules.commit).not.toHaveBeenCalled();
  });

  it("starts through executor first and commits dispatch only after success", async () => {
    schedules.load.mockResolvedValue(scheduleRecord());
    execution.command.mockResolvedValue({
      execution: { status: "applied", record: executionRecord({ phase: "active" }) },
      worldObservation: { id: "obs_active" },
    });
    schedules.commit.mockResolvedValue({
      status: "dispatched",
      record: scheduleRecord({ status: "dispatched", dispatchedAt: "2026-09-02T01:00:00.000Z" }),
    });
    const result = await dispatchKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T01:00:00.000Z",
    });
    expect(execution.command.mock.invocationCallOrder[0]).toBeLessThan(schedules.commit.mock.invocationCallOrder[0]);
    expect(result.status).toBe("dispatched");
  });

  it("leaves schedule open when owner permission is still pending", async () => {
    schedules.load.mockResolvedValue(scheduleRecord());
    execution.command.mockResolvedValue({
      execution: {
        status: "rejected",
        reason: "permission_required",
        record: executionRecord({ permissionPolicy: "owner_approval", permissionStatus: "pending" }),
      },
    });
    const result = await dispatchKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T01:00:00.000Z",
    });
    expect(result).toMatchObject({ status: "blocked", reason: "permission_required" });
    expect(schedules.commit).not.toHaveBeenCalled();
    expect(schedules.cancel).not.toHaveBeenCalled();
  });

  it("closes obsolete scheduled work when permission is denied", async () => {
    schedules.load.mockResolvedValue(scheduleRecord());
    execution.command.mockResolvedValue({
      execution: {
        status: "rejected",
        reason: "permission_required",
        record: executionRecord({ permissionPolicy: "owner_approval", permissionStatus: "denied" }),
      },
    });
    schedules.cancel.mockResolvedValue(scheduleRecord({ status: "cancelled" }));
    const result = await dispatchKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T01:00:00.000Z",
    });
    expect(result).toMatchObject({ status: "blocked", reason: "permission_denied" });
    expect(schedules.cancel).toHaveBeenCalledTimes(1);
  });

  it("persists expiry without ever calling the executor", async () => {
    schedules.load.mockResolvedValue(scheduleRecord());
    schedules.commit.mockResolvedValue({
      status: "expired",
      record: scheduleRecord({ status: "expired", expiredAt: "2026-09-02T02:10:00.000Z" }),
    });
    const result = await dispatchKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T02:10:00.000Z",
    });
    expect(result.status).toBe("expired");
    expect(execution.command).not.toHaveBeenCalled();
  });

  it("closes a due schedule when execution is already terminal", async () => {
    schedules.load.mockResolvedValue(scheduleRecord());
    execution.command.mockResolvedValue({
      execution: {
        status: "rejected",
        reason: "terminal_activity",
        record: executionRecord({ phase: "completed" }),
      },
    });
    schedules.cancel.mockResolvedValue(scheduleRecord({ status: "cancelled" }));
    const result = await dispatchKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T01:00:00.000Z",
    });
    expect(result).toMatchObject({ status: "blocked", reason: "execution_terminal:completed" });
    expect(schedules.cancel).toHaveBeenCalledTimes(1);
  });
});
