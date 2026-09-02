import { beforeEach, describe, expect, it, vi } from "vitest";

const recovery = vi.hoisted(() => ({ run: vi.fn() }));
const schedules = vi.hoisted(() => ({ dispatch: vi.fn() }));

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

const recoverySuccess = {
  status: "completed" as const,
  receipt: { runId: "run_a:proposal-recovery" },
  batch: { discovered: 1, processed: 1, failed: 0, items: [] },
};
const scheduleSuccess = { discovered: 1, attempted: 1, succeeded: 1, failed: 0, items: [] };

describe("Kaira autonomous life worker run coordinator contracts", () => {
  it("runs recovery and due schedule dispatch in one trusted tick", async () => {
    recovery.run.mockResolvedValue(recoverySuccess);
    schedules.dispatch.mockResolvedValue(scheduleSuccess);

    const result = await runKairaAutonomousLifeWorker({
      runId: "run_a",
      requestedLimit: 20,
      now: "2026-09-02T02:00:00Z",
    });

    expect(recovery.run).toHaveBeenCalledWith({
      runId: "run_a:proposal-recovery",
      requestedLimit: 20,
      now: "2026-09-02T02:00:00.000Z",
    });
    expect(schedules.dispatch).toHaveBeenCalledWith({
      now: "2026-09-02T02:00:00.000Z",
      batchSize: 20,
    });
    expect(result.status).toBe("completed");
  });

  it("continues schedule dispatch when proposal recovery throws", async () => {
    recovery.run.mockRejectedValue(new Error("recovery unavailable"));
    schedules.dispatch.mockResolvedValue(scheduleSuccess);

    const result = await runKairaAutonomousLifeWorker({
      runId: "run_b",
      requestedLimit: 10,
      now: "2026-09-02T02:00:00.000Z",
    });

    expect(schedules.dispatch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("partial_failure");
    expect(result.proposalRecovery).toMatchObject({ status: "failed", error: "recovery unavailable" });
  });

  it("continues preserving recovery result when schedule discovery throws", async () => {
    recovery.run.mockResolvedValue(recoverySuccess);
    schedules.dispatch.mockRejectedValue(new Error("schedule query unavailable"));

    const result = await runKairaAutonomousLifeWorker({
      runId: "run_c",
      requestedLimit: 10,
      now: "2026-09-02T02:00:00.000Z",
    });

    expect(result.status).toBe("partial_failure");
    expect(result.proposalRecovery.result).toEqual(recoverySuccess);
    expect(result.scheduleDispatch).toMatchObject({ status: "failed", error: "schedule query unavailable" });
  });

  it("reports failed when both independent stages fail", async () => {
    recovery.run.mockRejectedValue(new Error("recovery unavailable"));
    schedules.dispatch.mockRejectedValue(new Error("schedule unavailable"));

    const result = await runKairaAutonomousLifeWorker({
      runId: "run_d",
      requestedLimit: 10,
      now: "2026-09-02T02:00:00.000Z",
    });

    expect(result.status).toBe("failed");
  });

  it("rejects invalid tick identity/time before any stage runs", async () => {
    await expect(runKairaAutonomousLifeWorker({
      runId: "",
      requestedLimit: 10,
      now: "bad-time",
    })).rejects.toThrow("run id required");
    expect(recovery.run).not.toHaveBeenCalled();
    expect(schedules.dispatch).not.toHaveBeenCalled();
  });
});
