import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  load: vi.fn(),
  materialize: vi.fn(),
}));

vi.mock("./kairaActivityProposalRecoveryStore", () => ({
  claimKairaActivityProposalRecovery: mocks.claim,
  completeKairaActivityProposalRecovery: mocks.complete,
}));
vi.mock("./kairaActivityProposalStore", () => ({ loadKairaActivityProposal: mocks.load }));
vi.mock("./kairaActivityProposalCoordinator", () => ({ materializeKairaActivityProposal: mocks.materialize }));

import { recoverKairaActivityProposalMaterialization } from "./kairaActivityProposalRecoveryCoordinator";

const base = {
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  proposalId: "planning:idle_1:explore_archive",
  now: "2026-09-02T12:00:00.000Z",
};
const claim = (status: "claimed" | "reclaimed" | "busy" | "replayed" = "claimed") => ({
  status,
  receipt: {
    schemaVersion: 1,
    ownerUserId: "owner_1",
    kairaInstanceId: "kaira_a",
    instanceType: "individual",
    proposalId: base.proposalId,
    status: status === "replayed" ? "completed" : "claimed",
    claimedAt: base.now,
    leaseUntil: "2026-09-02T12:05:00.000Z",
    ...(status === "replayed" ? { completedAt: base.now, outcome: "materialized" } : {}),
  },
});
const proposal = (status: "selected" | "materialized" | "cancelled") => ({
  schemaVersion: 1,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual",
  proposalId: base.proposalId,
  status,
  selected: {
    proposalId: base.proposalId,
    candidate: {
      proposalId: base.proposalId,
      activityType: "exploration",
      motivationFit: 0.8,
      learnedPreference: 0,
      novelty: 0.8,
      contextFit: 0.8,
      interruptionCost: 0.1,
      risk: 0.1,
      repetitionPressure: 0,
      evidenceIds: ["catalog:x"],
      permissionPolicy: "none",
      notBefore: "2026-09-02T12:00:00.000Z",
    },
    score: 0.8,
    components: {},
  },
  createdAt: base.now,
  updatedAt: base.now,
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity proposal recovery coordinator contracts", () => {
  it("does not touch proposal/materialization while another worker owns the lease", async () => {
    mocks.claim.mockResolvedValue(claim("busy"));
    await expect(recoverKairaActivityProposalMaterialization(base)).resolves.toMatchObject({ status: "busy" });
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.materialize).not.toHaveBeenCalled();
  });

  it("materializes a durable selected proposal before completing recovery", async () => {
    mocks.claim.mockResolvedValue(claim("claimed"));
    mocks.load.mockResolvedValue(proposal("selected"));
    mocks.materialize.mockResolvedValue({ proposal: proposal("materialized"), execution: {}, schedule: {} });
    mocks.complete.mockResolvedValue({ ...claim().receipt, status: "completed", completedAt: base.now, outcome: "materialized" });

    const result = await recoverKairaActivityProposalMaterialization(base);
    expect(result.status).toBe("materialized");
    expect(mocks.materialize).toHaveBeenCalledBefore(mocks.complete);
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ outcome: "materialized" }));
  });

  it("never rematerializes an already-materialized proposal", async () => {
    mocks.claim.mockResolvedValue(claim("claimed"));
    mocks.load.mockResolvedValue(proposal("materialized"));
    mocks.complete.mockResolvedValue({ ...claim().receipt, status: "completed", completedAt: base.now, outcome: "already_materialized" });
    await expect(recoverKairaActivityProposalMaterialization(base)).resolves.toMatchObject({ status: "already_materialized" });
    expect(mocks.materialize).not.toHaveBeenCalled();
  });

  it("closes cancelled proposals without creating execution/schedule", async () => {
    mocks.claim.mockResolvedValue(claim("claimed"));
    mocks.load.mockResolvedValue(proposal("cancelled"));
    mocks.complete.mockResolvedValue({ ...claim().receipt, status: "completed", completedAt: base.now, outcome: "cancelled" });
    await expect(recoverKairaActivityProposalMaterialization(base)).resolves.toMatchObject({ status: "cancelled" });
    expect(mocks.materialize).not.toHaveBeenCalled();
  });

  it("leaves the recovery claim incomplete if materialization fails", async () => {
    mocks.claim.mockResolvedValue(claim("claimed"));
    mocks.load.mockResolvedValue(proposal("selected"));
    mocks.materialize.mockRejectedValue(new Error("schedule write failed"));
    await expect(recoverKairaActivityProposalMaterialization(base)).rejects.toThrow("schedule write failed");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
