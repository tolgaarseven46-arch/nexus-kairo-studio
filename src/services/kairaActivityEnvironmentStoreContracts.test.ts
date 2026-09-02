import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = { get: vi.fn(), set: vi.fn() };
  return {
    transaction,
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
    getDoc: vi.fn(),
    runTransaction: vi.fn(async (_db: unknown, callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
});

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  runTransaction: mocks.runTransaction,
}));
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import type { KairaActivityEnvironmentSnapshot } from "./kairaActivityEnvironmentAuthority";
import {
  loadKairaActivityEnvironmentSnapshot,
  provisionOrRefreshKairaActivityEnvironmentAtomic,
  saveKairaActivityEnvironmentSnapshot,
} from "./kairaActivityEnvironmentStore";

const snapshot = (
  observedAt = "2026-09-02T12:00:00.000Z",
  overrides: Partial<KairaActivityEnvironmentSnapshot> = {},
): KairaActivityEnvironmentSnapshot => ({
  schemaVersion: 1,
  kairaInstanceId: "kaira_a",
  observedAt,
  entries: [{
    catalogId: "experience_a",
    accessible: true,
    capabilities: { world_access: true },
    contextFit: 0.8,
    risk: 0.1,
    evidenceIds: ["environment:e1"],
  }],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Kaira activity environment store contracts", () => {
  it("creates a canonical snapshot under the Kaira instance id", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => false });
    const result = await saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: snapshot(),
    });
    expect(result.status).toBe("created");
    expect(mocks.doc).toHaveBeenCalledWith(expect.anything(), "kairaActivityEnvironments", "kaira_a");
    expect(mocks.transaction.set).toHaveBeenCalledOnce();
  });

  it("replays the same timestamp and semantics without rewriting", async () => {
    const existing = snapshot();
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => existing });
    const result = await saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: snapshot(),
    });
    expect(result.status).toBe("replayed");
    expect(mocks.transaction.set).not.toHaveBeenCalled();
  });

  it("treats entry/evidence/capability ordering as serialization, not semantics", async () => {
    const existing = snapshot();
    existing.entries = [
      { ...existing.entries[0], capabilities: { beta: false, world_access: true }, evidenceIds: ["z", "a"] },
      { catalogId: "experience_b", accessible: false, capabilities: { alpha: true }, contextFit: 0.2, risk: 0.7, evidenceIds: ["b"] },
    ];
    const incoming = snapshot();
    incoming.entries = [
      { catalogId: "experience_b", accessible: false, capabilities: { alpha: true }, contextFit: 0.2, risk: 0.7, evidenceIds: ["b"] },
      { ...incoming.entries[0], capabilities: { world_access: true, beta: false }, evidenceIds: ["a", "z"] },
    ];
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => existing });
    const result = await saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: incoming,
    });
    expect(result.status).toBe("replayed");
    expect(mocks.transaction.set).not.toHaveBeenCalled();
  });

  it("allows a newer trusted snapshot to replace the previous one", async () => {
    mocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => snapshot("2026-09-02T12:00:00.000Z"),
    });
    const result = await saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: snapshot("2026-09-02T12:05:00.000Z"),
    });
    expect(result.status).toBe("updated");
    expect(mocks.transaction.set).toHaveBeenCalledOnce();
  });

  it("rejects stale writes and same-timestamp semantic conflicts", async () => {
    mocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => snapshot("2026-09-02T12:05:00.000Z"),
    });
    await expect(saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: snapshot("2026-09-02T12:00:00.000Z"),
    })).rejects.toThrow("Stale Kaira activity environment snapshot");

    mocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => snapshot("2026-09-02T12:05:00.000Z"),
    });
    const conflict = snapshot("2026-09-02T12:05:00.000Z");
    conflict.entries[0] = { ...conflict.entries[0], accessible: false };
    await expect(saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: conflict,
    })).rejects.toThrow("snapshot conflict");
  });

  it("blocks Welcome Kaira before touching Firestore", async () => {
    await expect(saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "welcome_a",
      instanceType: "welcome",
      authority: "kaira_environment_controller",
      snapshot: snapshot("2026-09-02T12:00:00.000Z", { kairaInstanceId: "welcome_a" }),
    })).rejects.toThrow("cannot own activity environment");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
    await expect(loadKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "welcome_a",
      instanceType: "welcome",
    })).resolves.toBeNull();
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });

  it("rejects cross-instance writes before mutation", async () => {
    await expect(saveKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_b",
      instanceType: "individual",
      authority: "kaira_environment_controller",
      snapshot: snapshot(),
    })).rejects.toThrow("owner mismatch");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it("loads only structurally valid snapshots owned by the requested Kaira", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => snapshot() });
    await expect(loadKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
    })).resolves.toMatchObject({ kairaInstanceId: "kaira_a" });

    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => snapshot("2026-09-02T12:00:00.000Z", { kairaInstanceId: "kaira_b" }),
    });
    await expect(loadKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
    })).resolves.toBeNull();
  });

  it("provisions or refreshes only the exact built-in environment semantics", async () => {
    mocks.transaction.get.mockResolvedValueOnce({ exists: () => false });
    await expect(provisionOrRefreshKairaActivityEnvironmentAtomic({
      kairaInstanceId: "kaira_a", instanceType: "individual", snapshot: snapshot(),
    })).resolves.toMatchObject({ status: "provisioned" });

    mocks.transaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => snapshot("2026-09-02T12:00:00.000Z"),
    });
    await expect(provisionOrRefreshKairaActivityEnvironmentAtomic({
      kairaInstanceId: "kaira_a", instanceType: "individual", snapshot: snapshot("2026-09-02T12:05:00.000Z"),
    })).resolves.toMatchObject({ status: "refreshed", snapshot: { observedAt: "2026-09-02T12:05:00.000Z" } });

    const custom = snapshot("2026-09-02T12:00:00.000Z");
    custom.entries[0] = { ...custom.entries[0], accessible: false };
    mocks.transaction.get.mockResolvedValueOnce({ exists: () => true, data: () => custom });
    const before = mocks.transaction.set.mock.calls.length;
    await expect(provisionOrRefreshKairaActivityEnvironmentAtomic({
      kairaInstanceId: "kaira_a", instanceType: "individual", snapshot: snapshot("2026-09-02T12:10:00.000Z"),
    })).resolves.toMatchObject({ status: "existing", snapshot: { entries: [{ accessible: false }] } });
    expect(mocks.transaction.set).toHaveBeenCalledTimes(before);
  });
});
