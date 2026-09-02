import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  health: vi.fn(),
  config: vi.fn(),
}));

vi.mock("./kairaProposalRecoveryWorkerRunCoordinator", () => ({
  runKairaProposalRecoveryWorker: mocks.run,
}));
vi.mock("./kairaProposalRecoveryWorkerHealthRuntime", () => ({
  readKairaProposalRecoveryWorkerHealth: mocks.health,
}));
vi.mock("./kairaProposalRecoveryWorkerHealthConfig", () => ({
  resolveKairaProposalRecoveryWorkerHealthConfig: mocks.config,
}));
vi.mock("./kairaAutonomousLifeWorkerDurableRunCoordinator", () => ({
  runKairaAutonomousLifeWorkerDurable: vi.fn(),
}));
vi.mock("./kairaAutonomousLifeWorkerHealthRuntime", () => ({
  readKairaAutonomousLifeWorkerHealth: vi.fn(),
}));
vi.mock("./kairaAutonomousLifeWorkerHealthConfig", () => ({
  resolveKairaAutonomousLifeWorkerHealthConfig: vi.fn(),
}));

import { registerKairaProposalRecoveryWorkerRoute } from "./kairaProposalRecoveryWorkerRoute";

type Handler = (req: any, res: any) => Promise<unknown>;

function routeHarness() {
  const postHandlers = new Map<string, Handler>();
  const getHandlers = new Map<string, Handler>();
  const app = {
    post: vi.fn((path: string, fn: Handler) => {
      postHandlers.set(path, fn);
    }),
    get: vi.fn((path: string, fn: Handler) => {
      getHandlers.set(path, fn);
    }),
  } as any;
  registerKairaProposalRecoveryWorkerRoute(app);
  const postHandler = postHandlers.get("/internal/workers/kaira/proposal-recovery");
  const getHandler = getHandlers.get("/internal/workers/kaira/proposal-recovery/health");
  if (!postHandler || !getHandler) throw new Error("proposal recovery worker routes not registered");
  const response = {
    statusCode: 200,
    body: undefined as any,
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: any, body: unknown) {
      this.body = body;
      return this;
    }),
  };
  return { postHandler, getHandler, response };
}

function req(headers: Record<string, string>, body: Record<string, unknown> = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    get: (name: string) => normalized[name.toLowerCase()],
    body,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.KAIRA_INTERNAL_WORKER_SECRET;
  mocks.config.mockReturnValue({ status: "disabled", reason: "health_policy_not_configured" });
});

describe("Kaira proposal recovery worker route contracts", () => {
  it("fails closed when worker auth is not configured", async () => {
    const { postHandler, response } = routeHarness();
    await postHandler(req({ authorization: "Bearer anything", "x-kaira-worker-run-id": "run_1" }), response);
    expect(response.statusCode).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer before recovery coordination", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { postHandler, response } = routeHarness();
    await postHandler(req({ authorization: "Bearer wrong", "x-kaira-worker-run-id": "run_1" }), response);
    expect(response.statusCode).toBe(403);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("requires a stable logical run id after successful authentication", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { postHandler, response } = routeHarness();
    await postHandler(req({ authorization: "Bearer secret" }), response);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ ok: false, error: "worker_run_id_required" });
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("uses server time, stable run id and clamps the requested batch size", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    mocks.run.mockResolvedValue({
      status: "completed",
      receipt: {
        runId: "wake_123",
        status: "completed",
        requestedLimit: 100,
        startedAt: "2026-09-02T00:00:00.000Z",
        leaseUntil: "2026-09-02T00:10:00.000Z",
        completedAt: "2026-09-02T00:00:01.000Z",
        summary: { discovered: 0, processed: 0, failed: 0, items: [] },
      },
      batch: { discovered: 0, processed: 0, failed: 0, items: [] },
    });
    const { postHandler, response } = routeHarness();
    await postHandler(req(
      { authorization: "Bearer secret", "x-kaira-worker-run-id": "wake_123" },
      { limit: 999, now: "1900-01-01T00:00:00.000Z" },
    ), response);

    expect(mocks.run).toHaveBeenCalledOnce();
    const call = mocks.run.mock.calls[0][0];
    expect(call.runId).toBe("wake_123");
    expect(call.requestedLimit).toBe(100);
    expect(call.now).not.toBe("1900-01-01T00:00:00.000Z");
    expect(Number.isFinite(Date.parse(call.now))).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ ok: true, runId: "wake_123", limit: 100, status: "completed" });
  });

  it("requires the same internal auth before reading health", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { getHandler, response } = routeHarness();
    await getHandler(req({ authorization: "Bearer wrong" }), response);
    expect(response.statusCode).toBe(403);
    expect(mocks.config).not.toHaveBeenCalled();
    expect(mocks.health).not.toHaveBeenCalled();
  });

  it("does not read Firestore health data when deployment health policy is not configured", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { getHandler, response } = routeHarness();
    await getHandler(req({ authorization: "Bearer secret" }), response);
    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ ok: false, error: "health_policy_not_configured" });
    expect(mocks.health).not.toHaveBeenCalled();
  });

  it("returns unhealthy as 503 from a read-only health projection", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const thresholds = {
      maxSuccessfulRunAgeMinutes: 15,
      degradedBacklog: 10,
      unhealthyBacklog: 50,
      degradedConsecutiveWorkerFailures: 1,
      unhealthyConsecutiveWorkerFailures: 3,
      degradedItemFailureRate: 0.2,
      unhealthyItemFailureRate: 0.5,
    };
    mocks.config.mockReturnValue({
      status: "configured",
      thresholds,
      recentRunLimit: 20,
      backlogSampleLimit: 100,
    });
    mocks.health.mockResolvedValue({
      status: "unhealthy",
      reasons: ["recovery_backlog_high"],
      latestRunId: "run_7",
      latestSuccessfulRunAt: "2026-09-02T00:00:00.000Z",
      consecutiveWorkerFailures: 0,
      recentItemFailureRate: 0,
      selectedBacklogSampleCount: 100,
      backlogSampleLimit: 100,
      backlogSampleSaturated: true,
    });
    const { getHandler, response } = routeHarness();
    await getHandler(req({ authorization: "Bearer secret" }), response);

    expect(mocks.health).toHaveBeenCalledWith(expect.objectContaining({
      thresholds,
      recentRunLimit: 20,
      backlogSampleLimit: 100,
    }));
    expect(response.statusCode).toBe(503);
    expect(response.body).toMatchObject({
      ok: false,
      health: { status: "unhealthy", reasons: ["recovery_backlog_high"] },
    });
  });
});
