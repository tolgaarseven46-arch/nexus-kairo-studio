import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreKairaActivityProposal } from "./kairaActivityPlanningPolicy";
import { createKairaActivityProposalRecord } from "./kairaActivityProposalRecord";

const mocks = vi.hoisted(() => ({
  createProposal: vi.fn(),
  markMaterialized: vi.fn(),
  planExecution: vi.fn(),
  createSchedule: vi.fn(),
}));

vi.mock("./kairaActivityProposalStore", () => ({
  createKairaActivityProposalAtomic: mocks.createProposal,
  markKairaActivityProposalMaterializedAtomic: mocks.markMaterialized,
}));
vi.mock("./kairaActivityExecutionCoordinator", () => ({
  planKairaActivityExecution: mocks.planExecution,
}));
vi.mock("./kairaActivityScheduleStore", () => ({
  createKairaActivityScheduleAtomic: mocks.createSchedule,
}));

import {
  materializeKairaActivityProposal,
  selectAndPersistKairaActivityProposal,
} from "./kairaActivityProposalCoordinator";

const candidate = () => ({
  proposalId: "theatre_01",
  activityType: "theatre",
  motivation: { kind: "recreation" as const, strength: 0.9 },
  learnedPreference: { affinity: 0.7, confidence: 0.9 },
  noveltyFit: 0.7,
  contextualFit: 0.9,
  interruptionCost: 0.1,
  risk: 0.1,
  repetitionPressure: 0.1,
  availability: "available" as const,
  permissionPolicy: "owner_approval" as const,
  notBefore: "2026-09-02T18:00:00.000Z",
  expiresAt: "2026-09-02T20:00:00.000Z",
  evidenceIds: ["preference:theatre"],
});

const proposal = () => createKairaActivityProposalRecord({
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual",
  selected: scoreKairaActivityProposal(candidate()),
  now: "2026-09-02T12:00:00.000Z",
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity proposal coordinator contracts", () => {
  it("persists only a proposal actually selected by the planning policy", async () => {
    mocks.createProposal.mockImplementation(async (record) => ({ status: "created", record }));
    const result = await selectAndPersistKairaActivityProposal({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates: [candidate()],
      now: "2026-09-02T12:00:00.000Z",
    });
    expect(result.status).toBe("selected");
    expect(mocks.createProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: "theatre_01",
        status: "selected",
        selected: expect.objectContaining({
          candidate: expect.objectContaining({ evidenceIds: ["preference:theatre"] }),
        }),
      }),
    );
  });

  it("does not persist when generic planning policy selects nothing", async () => {
    const weak = {
      ...candidate(),
      motivation: { kind: "recreation" as const, strength: 0.01 },
      learnedPreference: { affinity: -0.5, confidence: 1 },
      noveltyFit: 0,
      contextualFit: 0,
      interruptionCost: 1,
      risk: 1,
      repetitionPressure: 1,
    };
    const result = await selectAndPersistKairaActivityProposal({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates: [weak],
      now: "2026-09-02T12:00:00.000Z",
    });
    expect(result.status).toBe("none");
    expect(mocks.createProposal).not.toHaveBeenCalled();
  });

  it("materializes execution first, schedule second, proposal terminal projection last", async () => {
    const record = proposal();
    mocks.planExecution.mockResolvedValue({ executionStatus: "created", execution: { activityId: "theatre_01" }, worldObservation: { id: "world_plan" } });
    mocks.createSchedule.mockResolvedValue({ status: "created", record: { activityId: "theatre_01" } });
    mocks.markMaterialized.mockResolvedValue({ ...record, status: "materialized", materializedAt: "2026-09-02T12:01:00.000Z" });

    const result = await materializeKairaActivityProposal({
      proposal: record,
      now: "2026-09-02T12:01:00.000Z",
    });
    expect(result.proposal.status).toBe("materialized");
    expect(mocks.planExecution).toHaveBeenCalledWith(expect.objectContaining({
      activityId: "theatre_01",
      activityType: "theatre",
      permissionPolicy: "owner_approval",
    }));
    expect(mocks.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      activityId: "theatre_01",
      notBefore: "2026-09-02T18:00:00.000Z",
      expiresAt: "2026-09-02T20:00:00.000Z",
    }));
    expect(mocks.planExecution.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.createSchedule.mock.invocationCallOrder[0]);
    expect(mocks.createSchedule.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.markMaterialized.mock.invocationCallOrder[0]);
  });

  it("never materializes a cancelled proposal", async () => {
    const record = { ...proposal(), status: "cancelled" as const };
    await expect(materializeKairaActivityProposal({
      proposal: record,
      now: "2026-09-02T12:01:00.000Z",
    })).rejects.toThrow("cannot materialize");
    expect(mocks.planExecution).not.toHaveBeenCalled();
  });
});
