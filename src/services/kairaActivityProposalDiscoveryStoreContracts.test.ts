import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((count: number) => ({ kind: "limit", count })),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  runTransaction: vi.fn(),
  where: vi.fn((field: string, op: string, value: unknown) => ({ kind: "where", field, op, value })),
}));
vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import { listSelectedKairaActivityProposals } from "./kairaActivityProposalStore";

beforeEach(() => vi.clearAllMocks());

describe("Kaira proposal indexed recovery discovery", () => {
  it("queries only canonical selected proposals instead of scanning the collection", async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [
        { data: () => ({ schemaVersion: 1, status: "selected", proposalId: "p1" }) },
        { data: () => ({ schemaVersion: 1, status: "materialized", proposalId: "p2" }) },
      ],
    });

    const result = await listSelectedKairaActivityProposals({ batchSize: 20 });

    expect(firestore.where).toHaveBeenCalledWith("status", "==", "selected");
    expect(firestore.limit).toHaveBeenCalledWith(20);
    expect(firestore.query).toHaveBeenCalledOnce();
    expect(firestore.getDocs).toHaveBeenCalledWith(expect.objectContaining({ parts: expect.any(Array) }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: "selected", proposalId: "p1" });
  });

  it("bounds worker batch size to protect the recovery loop", async () => {
    firestore.getDocs.mockResolvedValue({ docs: [] });
    await listSelectedKairaActivityProposals({ batchSize: 5000 });
    expect(firestore.limit).toHaveBeenCalledWith(100);
  });
});
