import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ claim: vi.fn(), complete: vi.fn(), fail: vi.fn() }));
const worker = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("./kairaAutonomousLifeWorkerRunStore", () => ({
  claimKairaAutonomousLifeWorkerRun: store.claim,
  completeKairaAutonomousLifeWorkerRun: store.complete,
  failKairaAutonomousLifeWorkerRun: store.fail,
}));
vi.mock("./kairaAutonomousLifeWorkerRunCoordinator", () => ({
  runKairaAutonomousLifeWorker: worker.run,
}));

import { runKairaAutonomousLifeWorkerDurable } from "./kairaAutonomousLifeWorkerDurableRunCoordinator";

beforeEach(() => vi.clearAllMocks());

const runningReceipt = {
  runId: "tick_1",
  status: "running" as const,
  requestedLimit: 20,
  startedAt: "2026-09-02T05:00:00.000Z",
  leaseUntil: "2026-09-02T05:10:00.000Z",
};

const completedWorker = {
  status: "degraded" as const,
  runId: "tick_1",
  processedAt: "2026-09-02T05:00:00.000Z",
  planningInbox: {
    status: "completed" as const,
    result: { discovered: 1, completed: 0, busy: 0, deferred: 1, failed: 0, items: [] },
  },
  proposalRecovery: {
    status: "completed" as const,
    result: { status: "completed" as const, receipt: runningReceipt, batch: { discovered: 0, processed: 0, failed: 0, items: [] } },
  },
  scheduleDispatch: {
    status: "completed" as const,
    result: { discovered: 0, attempted: 0, succeeded: 0, failed: 0, items: [] },
  },
};

describe("Kaira durable autonomous life worker coordination", () => {
  it("persists one compact terminal summary after the complete pipeline", async () => {
    store.claim.mockResolvedValue({ status: "claimed", receipt: runningReceipt });
    worker.run.mockResolvedValue(completedWorker);
    store.complete.mockImplementation(async (input) => ({
      ...runningReceipt,
      status: "completed",
      completedAt: input.now,
      summary: input.summary,
    }));

    const result = await runKairaAutonomousLifeWorkerDurable({
      runId: "tick_1",
      requestedLimit: 20,
      now: "2026-09-02T05:00:00.000Z",
    });
    expect(result.status).toBe("executed");
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
      summary: expect.objectContaining({
        outcome: "degraded",
        planning: expect.objectContaining({ deferred: 1 }),
      }),
    }));
  });

  it("does not enter the pipeline while another caller owns the live lease", async () => {
    store.claim.mockResolvedValue({ status: "busy", receipt: runningReceipt });
    await expect(runKairaAutonomousLifeWorkerDurable({
      runId: "tick_1",
      requestedLimit: 20,
      now: "2026-09-02T05:01:00.000Z",
    })).resolves.toMatchObject({ status: "busy" });
    expect(worker.run).not.toHaveBeenCalled();
  });

  it("replays a terminal receipt without applying any stage twice", async () => {
    store.claim.mockResolvedValue({ status: "replayed", receipt: { ...runningReceipt, status: "completed" } });
    await expect(runKairaAutonomousLifeWorkerDurable({
      runId: "tick_1",
      requestedLimit: 20,
      now: "2026-09-02T05:02:00.000Z",
    })).resolves.toMatchObject({ status: "replayed" });
    expect(worker.run).not.toHaveBeenCalled();
  });
});
