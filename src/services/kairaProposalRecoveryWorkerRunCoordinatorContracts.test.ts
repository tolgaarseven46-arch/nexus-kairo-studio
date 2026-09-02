import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  recover: vi.fn(),
}));

vi.mock("./kairaProposalRecoveryWorkerRunStore", () => ({
  claimKairaProposalRecoveryWorkerRun: mocks.claim,
  completeKairaProposalRecoveryWorkerRun: mocks.complete,
  failKairaProposalRecoveryWorkerRun: mocks.fail,
}));
vi.mock("./kairaActivityProposalRecoveryDiscovery", () => ({
  recoverSelectedKairaActivityProposals: mocks.recover,
}));

import { runKairaProposalRecoveryWorker } from "./kairaProposalRecoveryWorkerRunCoordinator";

beforeEach(() => vi.clearAllMocks());

describe("Kaira proposal recovery worker run coordinator contracts", () => {
  it("does not execute recovery again for a replayed logical wake-up", async () => {
    const receipt = {
      runId: "wake_1",
      status: "completed",
      requestedLimit: 25,
      startedAt: "2026-09-02T00:00:00.000Z",
      leaseUntil: "2026-09-02T00:10:00.000Z",
      completedAt: "2026-09-02T00:00:02.000Z",
      summary: { discovered: 0, processed: 0, failed: 0, items: [] },
    };
    mocks.claim.mockResolvedValue({ status: "replayed", receipt });
    await expect(runKairaProposalRecoveryWorker({
      runId: "wake_1",
      requestedLimit: 25,
      now: "2026-09-02T00:05:00.000Z",
    })).resolves.toEqual({ status: "replayed", receipt });
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it("persists a compact batch summary after successful recovery", async () => {
    const running = {
      runId: "wake_2",
      status: "running",
      requestedLimit: 25,
      startedAt: "2026-09-02T00:00:00.000Z",
      leaseUntil: "2026-09-02T00:10:00.000Z",
    };
    const batch = {
      discovered: 2,
      processed: 1,
      failed: 1,
      items: [
        { status: "processed", proposalId: "p1", result: { status: "materialized" } },
        { status: "failed", proposalId: "p2", error: "boom" },
      ],
    };
    const completed = {
      ...running,
      status: "completed",
      completedAt: "2026-09-02T00:00:01.000Z",
      summary: {
        discovered: 2,
        processed: 1,
        failed: 1,
        items: [
          { proposalId: "p1", outcome: "materialized" },
          { proposalId: "p2", outcome: "failed", error: "boom" },
        ],
      },
    };
    mocks.claim.mockResolvedValue({ status: "claimed", receipt: running });
    mocks.recover.mockResolvedValue(batch);
    mocks.complete.mockResolvedValue(completed);

    const result = await runKairaProposalRecoveryWorker({
      runId: "wake_2",
      requestedLimit: 25,
      now: "2026-09-02T00:00:00.000Z",
    });
    expect(result.status).toBe("completed");
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({
      runId: "wake_2",
      summary: completed.summary,
    }));
  });

  it("marks the invocation failed when discovery itself throws", async () => {
    const running = {
      runId: "wake_3",
      status: "running",
      requestedLimit: 25,
      startedAt: "2026-09-02T00:00:00.000Z",
      leaseUntil: "2026-09-02T00:10:00.000Z",
    };
    const failed = {
      ...running,
      status: "failed",
      completedAt: "2026-09-02T00:00:00.000Z",
      failure: "query unavailable",
    };
    mocks.claim.mockResolvedValue({ status: "claimed", receipt: running });
    mocks.recover.mockRejectedValue(new Error("query unavailable"));
    mocks.fail.mockResolvedValue(failed);

    await expect(runKairaProposalRecoveryWorker({
      runId: "wake_3",
      requestedLimit: 25,
      now: "2026-09-02T00:00:00.000Z",
    })).resolves.toEqual({ status: "failed", receipt: failed, error: "query unavailable" });
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
