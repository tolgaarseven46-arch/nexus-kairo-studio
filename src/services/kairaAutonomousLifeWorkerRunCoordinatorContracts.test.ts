import { beforeEach, describe, expect, it, vi } from "vitest";

const planning = vi.hoisted(() => ({ process: vi.fn() }));
const recovery = vi.hoisted(() => ({ run: vi.fn() }));
const schedules = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("./kairaActivityPlanningTriggerInboxProcessor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivityPlanningTriggerInboxProcessor")>();
  return { ...actual, processPendingKairaActivityPlanningTriggers: planning.process };
});
vi.mock("./kairaProposalRecoveryWorkerRunCoordinator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaProposalRecoveryWorkerRunCoordinator")>();
  return { ...actual, runKairaProposalRecoveryWorker: recovery.run };
});
vi.mock("./kairaActivityScheduleDispatchDiscovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./kairaActivityScheduleDispatchDiscovery")>();
  return { ...actual, dispatchDueKairaActivitySchedules: schedules.dispatch };
});

import { runKairaAutonomousLifeWorker } from "./kairaAutonomousLifeWorkerRunCoordinator";

beforeEach(() => vi.clearAllMocks());

const planningSuccess = { discovered: 1, completed: 1, busy: 0, deferred: 0, failed: 0, items: [] };
const recoverySuccess = { status: "completed" as const, receipt: { runId: "run_a:proposal-recovery" }, batch: { discovered: 1, processed: 1, failed: 0, items: [] } };
const scheduleSuccess = { discovered: 1, attempted: 1, succeeded: 1, failed: 0, items: [] };

describe("Kaira autonomous life worker run coordinator contracts", () => {
  it("runs planning, recovery and due schedule dispatch in one trusted tick", async () => {
    planning.process.mockResolvedValue(planningSuccess);
    recovery.run.mockResolvedValue(recoverySuccess);
    schedules.dispatch.mockResolvedValue(scheduleSuccess);
    const result = await runKairaAutonomousLifeWorker({ runId: "run_a", requestedLimit: 20, now: "2026-09-02T02:00:00Z" });
    expect(planning.process).toHaveBeenCalledWith({ now: "2026-09-02T02:00:00.000Z", batchSize: 20, occupancyBatchSize: 20 });
    expect(recovery.run).toHaveBeenCalledWith({ runId: "run_a:proposal-recovery", requestedLimit: 20, now: "2026-09-02T02:00:00.000Z" });
    expect(schedules.dispatch).toHaveBeenCalledWith({ now: "2026-09-02T02:00:00.000Z", batchSize: 20 });
    expect(result.status).toBe("completed");
  });

  it("surfaces deferred planning as degraded without failing healthy downstream stages", async () => {
    planning.process.mockResolvedValue({ ...planningSuccess, completed: 0, deferred: 1 });
    recovery.run.mockResolvedValue(recoverySuccess);
    schedules.dispatch.mockResolvedValue(scheduleSuccess);
    const result = await runKairaAutonomousLifeWorker({ runId: "run_degraded", requestedLimit: 10, now: "2026-09-02T02:00:00Z" });
    expect(result.status).toBe("degraded");
    expect(result.planningInbox.result?.deferred).toBe(1);
  });

  it("continues later stages when planning throws", async () => {
    planning.process.mockRejectedValue(new Error("planning unavailable"));
    recovery.run.mockResolvedValue(recoverySuccess);
    schedules.dispatch.mockResolvedValue(scheduleSuccess);
    const result = await runKairaAutonomousLifeWorker({ runId: "run_b", requestedLimit: 10, now: "2026-09-02T02:00:00.000Z" });
    expect(result.status).toBe("partial_failure");
  });

  it("treats item-level planning failures as partial while preserving downstream work", async () => {
    planning.process.mockResolvedValue({ ...planningSuccess, completed: 0, failed: 1 });
    recovery.run.mockResolvedValue(recoverySuccess);
    schedules.dispatch.mockResolvedValue(scheduleSuccess);
    const result = await runKairaAutonomousLifeWorker({ runId: "run_c", requestedLimit: 10, now: "2026-09-02T02:00:00.000Z" });
    expect(result.status).toBe("partial_failure");
  });

  it("reports failed only when all three stages fail", async () => {
    planning.process.mockRejectedValue(new Error("planning unavailable"));
    recovery.run.mockRejectedValue(new Error("recovery unavailable"));
    schedules.dispatch.mockRejectedValue(new Error("schedule unavailable"));
    const result = await runKairaAutonomousLifeWorker({ runId: "run_e", requestedLimit: 10, now: "2026-09-02T02:00:00.000Z" });
    expect(result.status).toBe("failed");
  });

  it("rejects invalid tick identity/time before any stage runs", async () => {
    await expect(runKairaAutonomousLifeWorker({ runId: "", requestedLimit: 10, now: "bad-time" })).rejects.toThrow("run id required");
    expect(planning.process).not.toHaveBeenCalled();
  });
});
