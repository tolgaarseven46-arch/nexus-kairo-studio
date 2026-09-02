import { describe, expect, it } from "vitest";
import { evaluateKairaProposalRecoveryWorkerHealth } from "./kairaProposalRecoveryWorkerHealthPolicy";

const thresholds = {
  maxSuccessfulRunAgeMinutes: 15,
  degradedBacklog: 10,
  unhealthyBacklog: 50,
  degradedConsecutiveWorkerFailures: 1,
  unhealthyConsecutiveWorkerFailures: 3,
  degradedItemFailureRate: 0.2,
  unhealthyItemFailureRate: 0.5,
};

const completed = (runId: string, completedAt: string, failed = 0) => ({
  runId,
  status: "completed" as const,
  requestedLimit: 25,
  startedAt: completedAt,
  leaseUntil: completedAt,
  completedAt,
  summary: {
    discovered: 2,
    processed: 2 - failed,
    failed,
    items: [
      { proposalId: `${runId}_1`, outcome: failed ? ("failed" as const) : ("materialized" as const) },
      { proposalId: `${runId}_2`, outcome: "materialized" as const },
    ],
  },
});

const failed = (runId: string, completedAt: string) => ({
  runId,
  status: "failed" as const,
  requestedLimit: 25,
  startedAt: completedAt,
  leaseUntil: completedAt,
  completedAt,
  failure: "boom",
});

describe("Kaira proposal recovery worker health policy", () => {
  it("reports healthy for a recent successful run with no backlog", () => {
    const health = evaluateKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T00:10:00.000Z",
      recentRuns: [completed("run_1", "2026-09-02T00:05:00.000Z")],
      selectedBacklogSampleCount: 0,
      backlogSampleLimit: 100,
      thresholds,
    });
    expect(health.status).toBe("healthy");
    expect(health.reasons).toEqual([]);
  });

  it("separates worker-level failure streaks from item-level failures", () => {
    const health = evaluateKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T00:10:00.000Z",
      recentRuns: [
        failed("run_3", "2026-09-02T00:09:00.000Z"),
        failed("run_2", "2026-09-02T00:08:00.000Z"),
        failed("run_1", "2026-09-02T00:07:00.000Z"),
        completed("run_0", "2026-09-02T00:06:00.000Z", 1),
      ],
      selectedBacklogSampleCount: 1,
      backlogSampleLimit: 100,
      thresholds,
    });
    expect(health.status).toBe("unhealthy");
    expect(health.consecutiveWorkerFailures).toBe(3);
    expect(health.reasons).toContain("consecutive_worker_failures");
  });

  it("reports stale success as unhealthy when work is waiting", () => {
    const health = evaluateKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T01:00:00.000Z",
      recentRuns: [completed("run_1", "2026-09-02T00:00:00.000Z")],
      selectedBacklogSampleCount: 3,
      backlogSampleLimit: 100,
      thresholds,
    });
    expect(health.status).toBe("unhealthy");
    expect(health.reasons).toContain("successful_run_stale_with_backlog");
  });

  it("marks a saturated bounded backlog sample unhealthy without claiming an exact total", () => {
    const health = evaluateKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T00:10:00.000Z",
      recentRuns: [completed("run_1", "2026-09-02T00:09:00.000Z")],
      selectedBacklogSampleCount: 25,
      backlogSampleLimit: 25,
      thresholds: { ...thresholds, unhealthyBacklog: 100 },
    });
    expect(health.status).toBe("unhealthy");
    expect(health.backlogSampleSaturated).toBe(true);
    expect(health.reasons).toContain("recovery_backlog_high");
  });

  it("returns unknown when there is no terminal run and no queued work", () => {
    const health = evaluateKairaProposalRecoveryWorkerHealth({
      now: "2026-09-02T00:10:00.000Z",
      recentRuns: [],
      selectedBacklogSampleCount: 0,
      backlogSampleLimit: 100,
      thresholds,
    });
    expect(health.status).toBe("unknown");
    expect(health.reasons).toEqual(["no_terminal_worker_run"]);
  });
});
