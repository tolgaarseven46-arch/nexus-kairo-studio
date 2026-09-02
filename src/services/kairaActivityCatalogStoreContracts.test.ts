import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  createKairaActivityCatalogSnapshot,
  loadActiveKairaActivityCatalog,
  provisionKairaActivityCatalogIfMissingAtomic,
  publishKairaActivityCatalogAtomic,
} from "./kairaActivityCatalogStore";

const identity = { kairaInstanceId: "kaira_a", instanceType: "individual" as const };

const entry = (id = "Theatre 01") => ({
  catalogId: id,
  activityType: "Theatre Visit",
  motivationAffinity: { curiosity: 0.9 },
  preferenceKeys: ["Performance Type", "performance_type"],
  repetitionKey: "Theatre",
  requiredCapabilities: ["World Access", "world_access"],
  noveltyPotential: 0.8,
  permissionPolicy: "owner_approval" as const,
  experienceSubject: {
    preferenceKey: "Performance Type",
    experiencedValue: " theatre ",
  },
  evidenceIds: ["Catalog:theatre", "catalog:theatre"],
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity catalog store contracts", () => {
  it("canonicalizes one stable instance-owned snapshot without runtime availability facts", () => {
    expect(createKairaActivityCatalogSnapshot({
      ...identity,
      catalogVersion: " V1 ",
      entries: [entry()],
      publishedAt: "2026-09-02T01:00:00Z",
    })).toEqual({
      schemaVersion: 1,
      ...identity,
      catalogVersion: "v1",
      publishedAt: "2026-09-02T01:00:00.000Z",
      entries: [{
        catalogId: "theatre_01",
        activityType: "theatre_visit",
        motivationAffinity: { curiosity: 0.9 },
        preferenceKeys: ["performance_type"],
        repetitionKey: "theatre",
        requiredCapabilities: ["world_access"],
        noveltyPotential: 0.8,
        permissionPolicy: "owner_approval",
        experienceSubject: { preferenceKey: "performance_type", experiencedValue: "theatre" },
        evidenceIds: ["catalog:theatre"],
      }],
    });
  });

  it("rejects empty, oversized and duplicate catalogs before persistence", () => {
    expect(() => createKairaActivityCatalogSnapshot({
      ...identity,
      catalogVersion: "v1",
      entries: [],
      publishedAt: "2026-09-02T01:00:00Z",
    })).toThrow("catalog size");
    expect(() => createKairaActivityCatalogSnapshot({
      ...identity,
      catalogVersion: "v1",
      entries: Array.from({ length: 101 }, (_, index) => entry(`item_${index}`)),
      publishedAt: "2026-09-02T01:00:00Z",
    })).toThrow("catalog size");
    expect(() => createKairaActivityCatalogSnapshot({
      ...identity,
      catalogVersion: "v1",
      entries: [entry("Theatre 01"), entry("theatre_01")],
      publishedAt: "2026-09-02T01:00:00Z",
    })).toThrow("Duplicate Kaira activity catalog id");
  });

  it("loads and validates the canonical active snapshot", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        schemaVersion: 1,
        ...identity,
        catalogVersion: "V2",
        entries: [entry()],
        publishedAt: "2026-09-02T02:00:00Z",
      }),
    });

    const result = await loadActiveKairaActivityCatalog(identity);
    expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), "kairaActivityCatalog", "kaira_a");
    expect(result?.catalogVersion).toBe("v2");
    expect(result?.entries[0].catalogId).toBe("theatre_01");
  });

  it("publishes atomically and replays the exact same version", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const input = {
      ...identity,
      catalogVersion: "v3",
      entries: [entry()],
      publishedAt: "2026-09-02T03:00:00Z",
    };
    const published = await publishKairaActivityCatalogAtomic(input);
    expect(published.status).toBe("published");
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => published.snapshot }),
        set: vi.fn(),
      }),
    );
    await expect(publishKairaActivityCatalogAtomic(input)).resolves.toEqual({
      status: "replayed",
      snapshot: published.snapshot,
    });
  });

  it("fails closed on same-version semantic conflict and stale publish", async () => {
    const current = createKairaActivityCatalogSnapshot({
      ...identity,
      catalogVersion: "v4",
      entries: [entry()],
      publishedAt: "2026-09-02T04:00:00Z",
    });
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => current }),
        set: vi.fn(),
      }),
    );
    await expect(publishKairaActivityCatalogAtomic({
      ...identity,
      catalogVersion: "v4",
      entries: [{ ...entry(), noveltyPotential: 0.2 }],
      publishedAt: "2026-09-02T04:01:00Z",
    })).rejects.toThrow("version conflict");

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => current }),
        set: vi.fn(),
      }),
    );
    await expect(publishKairaActivityCatalogAtomic({
      ...identity,
      catalogVersion: "v5",
      entries: [entry()],
      publishedAt: "2026-09-02T03:59:00Z",
    })).rejects.toThrow("Stale Kaira activity catalog publish");
  });

  it("provisions only a missing instance catalog and preserves an existing authority", async () => {
    const set = vi.fn();
    const input = { ...identity, catalogVersion: "builtin_v1", entries: [entry()], publishedAt: "2026-09-02T01:00:00Z" };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const provisioned = await provisionKairaActivityCatalogIfMissingAtomic(input);
    expect(provisioned.status).toBe("provisioned");
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => provisioned.snapshot }), set: vi.fn() }),
    );
    await expect(provisionKairaActivityCatalogIfMissingAtomic({ ...input, catalogVersion: "builtin_v2" }))
      .resolves.toEqual({ status: "existing", snapshot: provisioned.snapshot });
  });
});
