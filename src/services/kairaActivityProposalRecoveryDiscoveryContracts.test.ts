import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listSelectedKairaActivityProposals: vi.fn(),
  recoverKairaActivityProposalMaterialization: vi.fn(),
}));

vi.mock("./kairaActivityProposalStore", () => ({
  listSelectedKairaActivityProposals: mocks.listSelectedKairaActivityProposals,
}));
vi.mock("./kairaActivityProposalRecoveryCoordinator", () => ({
  recoverKairaActivityProposalMaterialization: mocks.recoverKairaActivityProposalMaterialization,
}));

import { recoverSelectedKairaActivityProposals } from "./kairaActivityProposalRecoveryDiscovery";

const proposal = (proposalId: string) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  proposalId,
  status: "selected" as const,
  selected: {} as any,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira proposal recovery discovery contracts", () => {
  it("processes only discovered selected work through the existing recovery authority", async () => {
    mocks.listSelectedKairaActivityProposals.mockResolvedValue([proposal("p1"), proposal("p2")]);
    mocks.recoverKairaActivityProposalMaterialization.mockResolvedValue({ status: "materialized" });

    const result = await recoverSelectedKairaActivityProposals({
      now: "2026-09-02T00:10:00.000Z",
      batchSize: 10,
    });

    expect(mocks.listSelectedKairaActivityProposals).toHaveBeenCalledWith({ batchSize: 10 });
    expect(mocks.recoverKairaActivityProposalMaterialization).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ discovered: 2, processed: 2, failed: 0 });
  });

  it("isolates one failed proposal instead of aborting the rest of the batch", async () => {
    mocks.listSelectedKairaActivityProposals.mockResolvedValue([proposal("p1"), proposal("p2")]);
    mocks.recoverKairaActivityProposalMaterialization
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({ status: "materialized" });

    const result = await recoverSelectedKairaActivityProposals({
      now: "2026-09-02T00:10:00.000Z",
    });

    expect(result).toMatchObject({ discovered: 2, processed: 1, failed: 1 });
    expect(result.items[0]).toMatchObject({ status: "failed", proposalId: "p1", error: "transient" });
    expect(result.items[1]).toMatchObject({ status: "processed", proposalId: "p2" });
  });

  it("does not invoke recovery when the indexed work-set is empty", async () => {
    mocks.listSelectedKairaActivityProposals.mockResolvedValue([]);
    await expect(recoverSelectedKairaActivityProposals({
      now: "2026-09-02T00:10:00.000Z",
    })).resolves.toEqual({ discovered: 0, processed: 0, failed: 0, items: [] });
    expect(mocks.recoverKairaActivityProposalMaterialization).not.toHaveBeenCalled();
  });

  it("fails before discovery when worker time is invalid", async () => {
    await expect(recoverSelectedKairaActivityProposals({ now: "not-a-time" })).rejects.toThrow(
      "Invalid Kaira proposal recovery worker time",
    );
    expect(mocks.listSelectedKairaActivityProposals).not.toHaveBeenCalled();
  });
});
