import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  runTransaction: vi.fn(),
}));
vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  claimKairaProposalRecoveryWorkerRun,
  completeKairaProposalRecoveryWorkerRun,
} from "./kairaProposalRecoveryWorkerRunStore";

beforeEach(() => vi.clearAllMocks());

describe("Kaira proposal recovery worker run store contracts", () => {
  it("creates one durable run and reports busy while its lease is live", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const first = await claimKairaProposalRecoveryWorkerRun({
      runId: "wake_1",
      requestedLimit: 25,
      now: "2026-09-02T00:00:00.000Z",
    });
    expect(first.status).toBe("claimed");
    expect(set).toHaveBeenCalledTimes(1);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => first.receipt }), set: vi.fn() }),
    );
    await expect(claimKairaProposalRecoveryWorkerRun({
      runId: "wake_1",
      requestedLimit: 25,
      now: "2026-09-02T00:01:00.000Z",
    })).resolves.toMatchObject({ status: "busy" });
  });

  it("replays a completed run and rejects semantic drift under the same run id", async () => {
    const completed = {
      runId: "wake_2",
      status: "completed" as const,
      requestedLimit: 20,
      startedAt: "2026-09-02T00:00:00.000Z",
      leaseUntil: "2026-09-02T00:10:00.000Z",
      completedAt: "2026-09-02T00:00:02.000Z",
      summary: { discovered: 1, processed: 1, failed: 0, items: [{ proposalId: "p1", outcome: "materialized" as const }] },
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }), set: vi.fn() }),
    );
    await expect(claimKairaProposalRecoveryWorkerRun({
      runId: "wake_2",
      requestedLimit: 20,
      now: "2026-09-02T00:05:00.000Z",
    })).resolves.toEqual({ status: "replayed", receipt: completed });

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }), set: vi.fn() }),
    );
    await expect(claimKairaProposalRecoveryWorkerRun({
      runId: "wake_2",
      requestedLimit: 21,
      now: "2026-09-02T00:05:00.000Z",
    })).rejects.toThrow("idempotency conflict");
  });

  it("does not allow a completed run summary to drift", async () => {
    const completed = {
      runId: "wake_3",
      status: "completed" as const,
      requestedLimit: 10,
      startedAt: "2026-09-02T00:00:00.000Z",
      leaseUntil: "2026-09-02T00:10:00.000Z",
      completedAt: "2026-09-02T00:00:02.000Z",
      summary: { discovered: 0, processed: 0, failed: 0, items: [] },
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }), set: vi.fn() }),
    );
    await expect(completeKairaProposalRecoveryWorkerRun({
      runId: "wake_3",
      requestedLimit: 10,
      now: "2026-09-02T00:01:00.000Z",
      summary: { discovered: 1, processed: 1, failed: 0, items: [{ proposalId: "p1", outcome: "materialized" }] },
    })).rejects.toThrow("outcome conflict");
  });
});
