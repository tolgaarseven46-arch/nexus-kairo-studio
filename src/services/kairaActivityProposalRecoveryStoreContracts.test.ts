import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = { get: vi.fn(), set: vi.fn() };
  return {
    transaction,
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
    runTransaction: vi.fn(async (_db: unknown, callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
});

vi.mock("firebase/firestore", () => ({ doc: mocks.doc, runTransaction: mocks.runTransaction }));
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  claimKairaActivityProposalRecovery,
  completeKairaActivityProposalRecovery,
  type KairaActivityProposalRecoveryReceipt,
} from "./kairaActivityProposalRecoveryStore";

const receipt = (overrides: Partial<KairaActivityProposalRecoveryReceipt> = {}): KairaActivityProposalRecoveryReceipt => ({
  schemaVersion: 1,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual",
  proposalId: "planning:idle_1:explore_archive",
  status: "claimed",
  claimedAt: "2026-09-02T12:00:00.000Z",
  leaseUntil: "2026-09-02T12:05:00.000Z",
  ...overrides,
});

const input = () => ({
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  proposalId: "planning:idle_1:explore_archive",
  now: "2026-09-02T12:00:00.000Z",
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity proposal recovery store contracts", () => {
  it("claims one recovery lease for a proposal", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => false });
    await expect(claimKairaActivityProposalRecovery(input())).resolves.toMatchObject({ status: "claimed" });
    expect(mocks.transaction.set).toHaveBeenCalledOnce();
  });

  it("returns busy for a live lease and reclaims an expired one", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => receipt() });
    await expect(claimKairaActivityProposalRecovery({ ...input(), now: "2026-09-02T12:02:00.000Z" })).resolves.toMatchObject({ status: "busy" });
    mocks.transaction.set.mockClear();
    await expect(claimKairaActivityProposalRecovery({ ...input(), now: "2026-09-02T12:06:00.000Z" })).resolves.toMatchObject({ status: "reclaimed" });
    expect(mocks.transaction.set).toHaveBeenCalledOnce();
  });

  it("replays completed recovery and rejects outcome drift", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => receipt({ status: "completed", completedAt: "2026-09-02T12:03:00.000Z", outcome: "materialized" }) });
    await expect(claimKairaActivityProposalRecovery({ ...input(), now: "2026-09-02T12:04:00.000Z" })).resolves.toMatchObject({ status: "replayed" });
    await expect(completeKairaActivityProposalRecovery({ ...input(), now: "2026-09-02T12:04:00.000Z", outcome: "cancelled" })).rejects.toThrow("outcome conflict");
  });

  it("blocks Welcome Kaira before Firestore", async () => {
    await expect(claimKairaActivityProposalRecovery({ ...input(), kairaInstanceId: "welcome_a", instanceType: "welcome" })).rejects.toThrow("cannot own proposal recovery");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });
});
