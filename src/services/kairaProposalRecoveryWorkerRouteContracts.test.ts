import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recover: vi.fn(),
}));

vi.mock("./kairaActivityProposalRecoveryDiscovery", () => ({
  recoverSelectedKairaActivityProposals: mocks.recover,
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

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.KAIRA_INTERNAL_WORKER_SECRET;
});

describe("Kaira proposal recovery worker route contracts", () => {
  it("fails closed when worker auth is not configured", async () => {
    const { handler, response } = routeHarness();
    await handler({ get: () => "Bearer anything", body: {} }, response);
    expect(response.statusCode).toBe(503);
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer before recovery discovery", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    const { handler, response } = routeHarness();
    await handler({ get: () => "Bearer wrong", body: {} }, response);
    expect(response.statusCode).toBe(403);
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it("uses server time and clamps the requested batch size", async () => {
    process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
    mocks.recover.mockResolvedValue({ discovered: 0, processed: 0, failed: 0, items: [] });
    const { handler, response } = routeHarness();
    await handler({
      get: () => "Bearer secret",
      body: { limit: 999, now: "1900-01-01T00:00:00.000Z" },
    }, response);

    expect(mocks.recover).toHaveBeenCalledOnce();
    const call = mocks.recover.mock.calls[0][0];
    expect(call.batchSize).toBe(100);
    expect(call.now).not.toBe("1900-01-01T00:00:00.000Z");
    expect(Number.isFinite(Date.parse(call.now))).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ ok: true, limit: 100, discovered: 0 });
  });
});
