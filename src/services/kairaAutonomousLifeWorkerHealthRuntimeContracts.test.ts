import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listRuns: vi.fn(),
  listPermissions: vi.fn(),
}));

vi.mock("./kairaAutonomousLifeWorkerRunStore", () => ({
  listRecentKairaAutonomousLifeWorkerRuns: mocks.listRuns,
}));
vi.mock("./kairaActivityExecutionStore", () => ({
  listPendingKairaActivityPermissionExecutions: mocks.listPermissions,
}));

import { readKairaAutonomousLifeWorkerHealth } from "./kairaAutonomousLifeWorkerHealthRuntime";

const run = {
  runId: "r1",
  status: "completed" as const,
  requestedLimit: 25,
  startedAt: "2026-09-02T10:00:00.000Z",
  leaseUntil: "2026-09-02T10:10:00.000Z",
  completedAt: "2026-09-02T10:01:00.000Z",
  summary: {
    outcome: "completed" as const,
    planning: { status: "completed" as const, discovered: 0, completed: 0, busy: 0, deferred: 0, failed: 0 },
    recovery: { status: "completed" as const, discovered: 0, processed: 0, failed: 0 },
    schedules: { status: "completed" as const, discovered: 0, attempted: 0, succeeded: 0, failed: 0 },
  },
};

beforeEach(() => vi.clearAllMocks());

describe("Kaira autonomous life worker health runtime contracts", () => {
  it("reports pending permission attention without degrading healthy infrastructure", async () => {
    mocks.listRuns.mockResolvedValue([run]);
    mocks.listPermissions.mockResolvedValue([
      { createdAt: "2026-09-02T09:00:00.000Z" },
      { createdAt: "2026-09-02T09:30:00.000Z" },
    ]);
    const health = await readKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T10:05:00.000Z",
      maxTerminalRunAgeMinutes: 15,
    });
    expect(health.status).toBe("healthy");
    expect(health.permissionAttention).toEqual({
      status: "available",
      sampledPendingCount: 2,
      oldestPendingAt: "2026-09-02T09:00:00.000Z",
      sampleLimitReached: false,
    });
  });

  it("keeps worker health readable when the attention projection is temporarily unavailable", async () => {
    mocks.listRuns.mockResolvedValue([run]);
    mocks.listPermissions.mockRejectedValue(new Error("firestore unavailable"));
    const health = await readKairaAutonomousLifeWorkerHealth({
      now: "2026-09-02T10:05:00.000Z",
      maxTerminalRunAgeMinutes: 15,
    });
    expect(health.status).toBe("healthy");
    expect(health.permissionAttention.status).toBe("unavailable");
  });
});
