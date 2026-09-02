import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({ load: vi.fn(), publish: vi.fn() }));
const environment = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));

vi.mock("./kairaActivityCatalogStore", () => ({
  loadActiveKairaActivityCatalog: catalog.load,
  publishKairaActivityCatalogAtomic: catalog.publish,
}));
vi.mock("./kairaActivityEnvironmentStore", () => ({
  loadKairaActivityEnvironmentSnapshot: environment.load,
  saveKairaActivityEnvironmentSnapshot: environment.save,
}));

import { registerKairaActivityProvisioningRoute } from "./kairaActivityProvisioningRoute";

type Handler = (req: any, res: any) => Promise<unknown>;

function harness() {
  const gets = new Map<string, Handler>();
  const posts = new Map<string, Handler>();
  const app = {
    get: vi.fn((path: string, handler: Handler) => gets.set(path, handler)),
    post: vi.fn((path: string, handler: Handler) => posts.set(path, handler)),
  } as any;
  registerKairaActivityProvisioningRoute(app);
  const response = () => ({
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  });
  return { gets, posts, response };
}

function req(input: { headers?: Record<string, string>; body?: any; query?: any } = {}) {
  const headers = Object.fromEntries(Object.entries(input.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    get: (name: string) => headers[name.toLowerCase()],
    body: input.body || {},
    query: input.query || {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.KAIRA_INTERNAL_WORKER_SECRET = "secret";
});

describe("Kaira activity provisioning route contracts", () => {
  it("registers separate catalog and environment read/write surfaces", () => {
    const { gets, posts } = harness();
    expect([...gets.keys()].sort()).toEqual([
      "/internal/kaira/activity-catalog",
      "/internal/kaira/activity-environment",
    ]);
    expect([...posts.keys()].sort()).toEqual([
      "/internal/kaira/activity-catalog",
      "/internal/kaira/activity-environment",
    ]);
  });

  it("fails closed before any provisioning store access", async () => {
    const { gets, response } = harness();
    const res = response();
    await gets.get("/internal/kaira/activity-catalog")!(req({ headers: { authorization: "Bearer wrong" } }), res);
    expect(res.statusCode).toBe(403);
    expect(catalog.load).not.toHaveBeenCalled();
    expect(environment.load).not.toHaveBeenCalled();
  });

  it("publishes catalog with server-owned time and ignores caller timestamp", async () => {
    catalog.publish.mockImplementation(async (input: any) => ({ status: "published", snapshot: input }));
    const { posts, response } = harness();
    const res = response();
    await posts.get("/internal/kaira/activity-catalog")!(req({
      headers: { authorization: "Bearer secret" },
      body: {
        catalogVersion: "v1",
        publishedAt: "1900-01-01T00:00:00.000Z",
        entries: [{ catalogId: "theatre" }],
      },
    }), res);
    expect(res.statusCode).toBe(200);
    const call = catalog.publish.mock.calls[0][0];
    expect(call.catalogVersion).toBe("v1");
    expect(call.publishedAt).not.toBe("1900-01-01T00:00:00.000Z");
    expect(Number.isFinite(Date.parse(call.publishedAt))).toBe(true);
  });

  it("publishes environment with server-owned observation time and trusted authority", async () => {
    environment.save.mockImplementation(async (input: any) => ({ status: "created", snapshot: input.snapshot }));
    const { posts, response } = harness();
    const res = response();
    await posts.get("/internal/kaira/activity-environment")!(req({
      headers: { authorization: "Bearer secret" },
      body: {
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        observedAt: "1900-01-01T00:00:00.000Z",
        entries: [{ catalogId: "theatre", accessible: true }],
      },
    }), res);
    expect(res.statusCode).toBe(200);
    const call = environment.save.mock.calls[0][0];
    expect(call.authority).toBe("kaira_environment_controller");
    expect(call.snapshot.observedAt).not.toBe("1900-01-01T00:00:00.000Z");
    expect(Number.isFinite(Date.parse(call.snapshot.observedAt))).toBe(true);
  });

  it("loads one explicit instance environment and validates identity before store access", async () => {
    environment.load.mockResolvedValue({ schemaVersion: 1, kairaInstanceId: "kaira_a", observedAt: "2026-09-02T02:00:00.000Z", entries: [] });
    const { gets, response } = harness();
    const bad = response();
    await gets.get("/internal/kaira/activity-environment")!(req({ headers: { authorization: "Bearer secret" } }), bad);
    expect(bad.statusCode).toBe(400);
    expect(environment.load).not.toHaveBeenCalled();

    const good = response();
    await gets.get("/internal/kaira/activity-environment")!(req({
      headers: { authorization: "Bearer secret" },
      query: { kairaInstanceId: "kaira_a", instanceType: "individual" },
    }), good);
    expect(good.statusCode).toBe(200);
    expect(environment.load).toHaveBeenCalledWith({ kairaInstanceId: "kaira_a", instanceType: "individual" });
  });
});
