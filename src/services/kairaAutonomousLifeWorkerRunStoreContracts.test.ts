import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDocs: vi.fn(),
  limit: vi.fn((value: number) => value),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
}));
vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  claimKairaAutonomousLifeWorkerRun,
  completeKairaAutonomousLifeWorkerRun,
} from "./kairaAutonomousLifeWorkerRunStore";

beforeEach(() => vi.clearAllMocks());

const summary = {
  outcome: "degraded" as const,
  planning: { status: "completed" as const, discovered: 1, completed: 0, busy: 0, deferred: 1, failed: 0 },
  recovery: { status: "completed" as const, outcome: "completed", discovered: 0, processed: 0, failed: 0 },
  schedules: { status: "completed" as const, discovered: 0, attempted: 0, succeeded: 0, failed: 0 },
};

describe("Kaira autonomous life worker run store contracts", () => {
  it("claims one durable whole-tick lease and reports a concurrent retry as busy", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const first = await claimKairaAutonomousLifeWorkerRun({
      runId: "autonomous_1",
      requestedLimit: 25,
      now: "2026-09-02T05:00:00.000Z",
    });
    expect(first.status).toBe("claimed");
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => first.receipt }), set: vi.fn() }),
    );
    await expect(claimKairaAutonomousLifeWorkerRun({
      runId: "autonomous_1",
      requestedLimit: 25,
      now: "2026-09-02T05:01:00.000Z",
    })).resolves.toMatchObject({ status: "busy" });
  });

  it("replays a terminal tick without re-running work", async () => {
    const completed = {
      runId: "autonomous_2",
      status: "completed" as const,
      requestedLimit: 10,
      startedAt: "2026-09-02T05:00:00.000Z",
      leaseUntil: "2026-09-02T05:10:00.000Z",
      completedAt: "2026-09-02T05:00:02.000Z",
      summary,
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }), set: vi.fn() }),
    );
    await expect(claimKairaAutonomousLifeWorkerRun({
      runId: "autonomous_2",
      requestedLimit: 10,
      now: "2026-09-02T05:03:00.000Z",
    })).resolves.toEqual({ status: "replayed", receipt: completed });
  });

  it("rejects a different whole-tick outcome under the same completed run id", async () => {
    const existing = {
      runId: "autonomous_3",
      status: "completed" as const,
      requestedLimit: 10,
      startedAt: "2026-09-02T05:00:00.000Z",
      leaseUntil: "2026-09-02T05:10:00.000Z",
      completedAt: "2026-09-02T05:00:02.000Z",
      summary,
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, cb: (tx: any) => unknown) =>
      cb({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }), set: vi.fn() }),
    );
    await expect(completeKairaAutonomousLifeWorkerRun({
      runId: "autonomous_3",
      requestedLimit: 10,
      now: "2026-09-02T05:04:00.000Z",
      summary: { ...summary, outcome: "completed" },
    })).rejects.toThrow("outcome conflict");
  });
});
