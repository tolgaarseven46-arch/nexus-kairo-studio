import { describe, expect, it } from "vitest";
import { evaluateKairaAutonomousLifeWorkerHealth } from "./kairaAutonomousLifeWorkerHealthPolicy";

const receipt = (input: {
  runId: string;
  status?: "running" | "completed" | "failed";
  outcome?: "completed" | "degraded" | "partial_failure" | "failed";
  startedAt: string;
  completedAt?: string;
  leaseUntil?: string;
}) => ({
  runId: input.runId,
  status: input.status || "completed" as const,
  requestedLimit: 20,
  startedAt: input.startedAt,
  leaseUntil: input.leaseUntil || "2026-09-02T05:20:00.000Z",
  ...(input.completedAt ? { completedAt: input.completedAt } : {}),
  ...(input.outcome
    ? {
        summary: {
          outcome: input.outcome,
          planning: { status: "completed" as const, discovered: 0, completed: 0, busy: 0, deferred: 0, failed: 0 },
          recovery: { status: "completed" as const, discovered: 0, processed: 0, failed: 0 },
          schedules: { status: "completed" as const, discovered: 0, attempted: 0, succeeded: 0, failed: 0 },
        },
      }
    : {}),
});

describe("Kaira autonomous life worker health policy", () => {
  it("reports a recent completed holistic tick as healthy", () => {
    const health = evaluateKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T05:10:00.000Z",
      recentRuns: [receipt({ runId: "r1", outcome: "completed", startedAt: "2026-09-02T05:00:00.000Z", completedAt: "2026-09-02T05:01:00.000Z" })],
      maxTerminalRunAgeMinutes: 15,
    });
    expect(health).toMatchObject({ status: "healthy", latestOutcome: "completed", reasons: [] });
  });

  it("surfaces deferred source readiness as degraded rather than healthy", () => {
    const health = evaluateKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T05:10:00.000Z",
      recentRuns: [receipt({ runId: "r2", outcome: "degraded", startedAt: "2026-09-02T05:00:00.000Z", completedAt: "2026-09-02T05:01:00.000Z" })],
      maxTerminalRunAgeMinutes: 15,
    });
    expect(health).toMatchObject({
      status: "degraded",
      reasons: ["latest_autonomous_tick_degraded"],
      consecutiveDegradedTicks: 1,
    });
  });

  it("reports partial failure, expired lease and stale wakeups as unhealthy", () => {
    const partial = evaluateKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T05:10:00.000Z",
      recentRuns: [receipt({ runId: "r3", outcome: "partial_failure", startedAt: "2026-09-02T05:00:00.000Z", completedAt: "2026-09-02T05:01:00.000Z" })],
      maxTerminalRunAgeMinutes: 15,
    });
    expect(partial.status).toBe("unhealthy");

    const stuck = evaluateKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T05:10:00.000Z",
      recentRuns: [receipt({ runId: "r4", status: "running", startedAt: "2026-09-02T04:50:00.000Z", leaseUntil: "2026-09-02T05:00:00.000Z" })],
      maxTerminalRunAgeMinutes: 15,
    });
    expect(stuck).toMatchObject({ status: "unhealthy", reasons: ["autonomous_tick_lease_expired"] });

    const stale = evaluateKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T06:00:00.000Z",
      recentRuns: [receipt({ runId: "r5", outcome: "completed", startedAt: "2026-09-02T05:00:00.000Z", completedAt: "2026-09-02T05:01:00.000Z" })],
      maxTerminalRunAgeMinutes: 15,
    });
    expect(stale).toMatchObject({ status: "unhealthy", reasons: ["autonomous_tick_stale"] });
  });
});
