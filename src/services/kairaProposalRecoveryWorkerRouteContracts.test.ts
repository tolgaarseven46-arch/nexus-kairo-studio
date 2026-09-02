import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
}));

vi.mock("./kairaProposalRecoveryWorkerRunCoordinator", () => ({
  runKairaProposalRecoveryWorker: mocks.run,
}));

import { registerKairaProposalRecoveryWorkerRoute } from "./kairaProposalRecoveryWorkerRoute";

function routeHarness() {
  let handler: ((req: any, res: any) => Promise<unknown>) | undefined;
  const app = {
    post: vi.fn((path: string, fn: typeof handler) => {
      expect(path).toBe("/internal/workers/kaira/proposal-recovery");
      handler = fn;
    }),
  } as any;
  registerKairaProposalRecoveryWorkerRoute(app);
  if (!handler) throw new Error("worker handler not registered");
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
  return { handler, response };
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
});

describe("Kaira proposal recovery worker route contracts", () => {
  it("fails closed when worker auth is not configured", async () => {
    const { handler, response } = routeHarness();
    await handler(req({ authorization: "Bearer anything", "x-kaira-worker-run-id": "run_1" }), response);
    expect(response.statusCode).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer before recovery coordination", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { handler, response } = routeHarness();
    await handler(req({ authorization: "Bearer wrong", "x-kaira-worker-run-id": "run_1" }), response);
    expect(response.statusCode).toBe(403);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("requires a stable logical run id after successful authentication", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { handler, response } = routeHarness();
    await handler(req({ authorization: "Bearer secret" }), response);
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
    const { handler, response } = routeHarness();
    await handler(req(
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
});
