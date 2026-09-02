import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ authorize: vi.fn() }));
const autonomous = vi.hoisted(() => ({ run: vi.fn() }));

vi.mock("./kairaInternalWorkerAuth", () => ({ authorizeKairaInternalWorker: auth.authorize }));
vi.mock("./kairaAutonomousLifeWorkerRunCoordinator", () => ({ runKairaAutonomousLifeWorker: autonomous.run }));
vi.mock("./kairaProposalRecoveryWorkerRunCoordinator", () => ({ runKairaProposalRecoveryWorker: vi.fn() }));
vi.mock("./kairaProposalRecoveryWorkerHealthRuntime", () => ({ readKairaProposalRecoveryWorkerHealth: vi.fn() }));
vi.mock("./kairaProposalRecoveryWorkerHealthConfig", () => ({ resolveKairaProposalRecoveryWorkerHealthConfig: vi.fn() }));

import { registerKairaProposalRecoveryWorkerRoute } from "./kairaProposalRecoveryWorkerRoute";

type Handler = (req: any, res: any) => Promise<unknown> | unknown;

function registeredRoutes() {
  const posts = new Map<string, Handler>();
  const gets = new Map<string, Handler>();
  const app = {
    post: vi.fn((path: string, handler: Handler) => posts.set(path, handler)),
    get: vi.fn((path: string, handler: Handler) => gets.set(path, handler)),
  };
  registerKairaProposalRecoveryWorkerRoute(app as any);
  return { posts, gets };
}

function response() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn((value) => value);
  return res;
}

function request(input: { authorization?: string; runId?: string; body?: unknown } = {}) {
  return {
    body: input.body || {},
    get: vi.fn((name: string) => {
      if (name === "authorization") return input.authorization;
      if (name === "x-kaira-worker-run-id") return input.runId;
      return undefined;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-02T04:05:06.000Z"));
  process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.KAIRA_INTERNAL_WORKER_SECRET;
});

describe("Kaira autonomous life worker route contracts", () => {
  it("registers the autonomous-life route under the existing internal worker registrar", () => {
    const { posts } = registeredRoutes();
    expect(posts.has("/internal/workers/kaira/autonomous-life")).toBe(true);
  });

  it("rejects unauthorized requests before autonomous work", async () => {
    auth.authorize.mockReturnValue({ status: "rejected", httpStatus: 401, reason: "unauthorized" });
    const { posts } = registeredRoutes();
    const res = response();

    await posts.get("/internal/workers/kaira/autonomous-life")!(request({ runId: "run_a" }), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(autonomous.run).not.toHaveBeenCalled();
  });

  it("requires a worker run id after authorization", async () => {
    auth.authorize.mockReturnValue({ status: "authorized" });
    const { posts } = registeredRoutes();
    const res = response();

    await posts.get("/internal/workers/kaira/autonomous-life")!(request(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(autonomous.run).not.toHaveBeenCalled();
  });

  it("uses server time and bounded limit without accepting client runtime state", async () => {
    auth.authorize.mockReturnValue({ status: "authorized" });
    autonomous.run.mockResolvedValue({
      status: "completed",
      runId: "run_a",
      processedAt: "2026-09-02T04:05:06.000Z",
      proposalRecovery: { status: "completed" },
      scheduleDispatch: { status: "completed" },
    });
    const { posts } = registeredRoutes();
    const res = response();

    await posts.get("/internal/workers/kaira/autonomous-life")!(request({
      authorization: "Bearer secret",
      runId: "run_a",
      body: {
        limit: 999,
        now: "1999-01-01T00:00:00.000Z",
        dynamicState: { anger: 100 },
        catalog: [{ activityType: "client_injected" }],
      },
    }), res);

    expect(autonomous.run).toHaveBeenCalledWith({
      runId: "run_a",
      requestedLimit: 100,
      now: "2026-09-02T04:05:06.000Z",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns retryable failure status for partial autonomous ticks", async () => {
    auth.authorize.mockReturnValue({ status: "authorized" });
    autonomous.run.mockResolvedValue({
      status: "partial_failure",
      runId: "run_a",
      processedAt: "2026-09-02T04:05:06.000Z",
      proposalRecovery: { status: "completed" },
      scheduleDispatch: { status: "failed", error: "query unavailable" },
    });
    const { posts } = registeredRoutes();
    const res = response();

    await posts.get("/internal/workers/kaira/autonomous-life")!(request({ runId: "run_a" }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false, status: "partial_failure" }));
  });
});
