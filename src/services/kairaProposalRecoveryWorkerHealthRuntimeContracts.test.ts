import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runs: vi.fn(),
  proposals: vi.fn(),
}));
vi.mock("./kairaProposalRecoveryWorkerRunStore", () => ({
  listRecentKairaProposalRecoveryWorkerRuns: mocks.runs,
}));
vi.mock("./kairaActivityProposalStore", () => ({
  listSelectedKairaActivityProposals: mocks.proposals,
}));

import { readKairaProposalRecoveryWorkerHealth } from "./kairaProposalRecoveryWorkerHealthRuntime";

const thresholds = {
  maxSuccessfulRunAgeMinutes: 15,
  degradedBacklog: 10,
  unhealthyBacklog: 50,
  degradedConsecutiveWorkerFailures: 1,
  unhealthyConsecutiveWorkerFailures: 3,
  degradedItemFailureRate: 0.2,
  unhealthyItemFailureRate: 0.5,
};

beforeEach(() => vi.clearAllMocks());

describe("Kaira proposal recovery worker health runtime", () => {
  it("combines bounded run history and selected proposal backlog without mutation", async () => {
    mocks.runs.mockResolvedValue([
      {
        runId: "r1",
        status: "completed",
        requestedLimit: 25,
        startedAt: "2026-09-02T00:00:00.000Z",
        leaseUntil: "2026-09-02T00:10:00.000Z",
        completedAt: "2026-09-02T00:01:00.000Z",
        summary: { discovered: 0, processed: 0, failed: 0, items: [] },
      },
    ]);
    mocks.proposals.mockResolvedValue([]);

    const result = await readKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T00:02:00.000Z",
      thresholds,
      recentRunLimit: 7,
      backlogSampleLimit: 40,
    });

    expect(mocks.runs).toHaveBeenCalledWith({ limit: 7 });
    expect(mocks.proposals).toHaveBeenCalledWith({ batchSize: 40 });
    expect(result.status).toBe("healthy");
  });

  it("clamps read-model query sizes instead of allowing unbounded health scans", async () => {
    mocks.runs.mockResolvedValue([]);
    mocks.proposals.mockResolvedValue([]);
    await readKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T00:02:00.000Z",
      thresholds,
      recentRunLimit: 9999,
      backlogSampleLimit: 9999,
    });
    expect(mocks.runs).toHaveBeenCalledWith({ limit: 100 });
    expect(mocks.proposals).toHaveBeenCalledWith({ batchSize: 100 });
  });
});
