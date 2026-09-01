import { beforeEach, describe, expect, it, vi } from "vitest";

const claim = vi.fn();
const complete = vi.fn();
const evaluate = vi.fn();
const createProposal = vi.fn();

vi.mock("./kairaActivityPlanningTriggerStore", () => ({
  claimKairaActivityPlanningTrigger: (...args: unknown[]) => claim(...args),
  completeKairaActivityPlanningTrigger: (...args: unknown[]) => complete(...args),
}));

vi.mock("./kairaActivityPlanningRuntime", () => ({
  evaluateTriggeredKairaActivityPlanning: (...args: unknown[]) => evaluate(...args),
}));

vi.mock("./kairaActivityProposalStore", () => ({
  createKairaActivityProposalAtomic: (...args: unknown[]) => createProposal(...args),
}));

import {
  evaluateAndCommitKairaActivityPlanningTrigger,
  planningEpisodeProposalId,
} from "./kairaActivityPlanningCommitCoordinator";

const receipt = (status: "claimed" | "completed" = "claimed") => ({
  schemaVersion: 1 as const,
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  triggerId: "idle_1",
  triggerKind: "idle_transition" as const,
  sourceId: "presence_1",
  occurredAt: "2026-09-02T00:00:00.000Z",
  status,
  claimedAt: "2026-09-02T00:00:00.000Z",
  leaseUntil: "2026-09-02T00:05:00.000Z",
  ...(status === "completed" ? { completedAt: "2026-09-02T00:01:00.000Z" } : {}),
});

const input = () => ({
  ownerUserId: "owner_a",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  trigger: {
    triggerId: "idle_1",
    kind: "idle_transition" as const,
    sourceId: "presence_1",
    occurredAt: "2026-09-02T00:00:00.000Z",
    previousBusy: true,
    currentBusy: false as const,
  },
  catalog: [] as any[],
  environment: {} as any,
  activeExecutions: [] as any[],
  schedules: [] as any[],
  dynamicState: {} as any,
  now: "2026-09-02T00:01:00.000Z",
});

const selectedEvaluation = () => ({
  status: "evaluated" as const,
  triggerDecision: { status: "evaluate" as const, reason: "idle_transition" as const },
  candidateRuntime: { status: "generated" as const, motivation: {} as any, candidates: [] },
  planning: {
    status: "selected" as const,
    ranked: [],
    selected: {
      proposalId: "explore_archive",
      score: 0.8,
      candidate: {
        proposalId: "explore_archive",
        activityType: "exploration",
        motivation: { kind: "curiosity" as const, strength: 0.9 },
        learnedPreference: { affinity: 0, confidence: 0 },
        noveltyFit: 0.8,
        contextualFit: 0.9,
        interruptionCost: 0.1,
        risk: 0.1,
        repetitionPressure: 0,
        availability: "available" as const,
        permissionPolicy: "none" as const,
        notBefore: "2026-09-02T00:01:00.000Z",
        expiresAt: "2026-09-02T01:01:00.000Z",
        evidenceIds: ["environment:archive"],
      },
      components: {
        motivation: 0.25,
        preference: 0,
        novelty: 0.1,
        context: 0.18,
        interruptionCost: -0.01,
        risk: -0.01,
        repetition: 0,
      },
    },
  },
});

describe("Kaira planning evaluation -> proposal commit coordinator contracts", () => {
  beforeEach(() => {
    claim.mockReset();
    complete.mockReset();
    evaluate.mockReset();
    createProposal.mockReset();
  });

  it("derives stable episode proposal ids from trigger + selected candidate", () => {
    expect(planningEpisodeProposalId("Idle 1", "Explore Archive")).toBe("planning:idle_1:explore_archive");
    expect(planningEpisodeProposalId("idle_1", "explore_archive")).toBe("planning:idle_1:explore_archive");
    expect(planningEpisodeProposalId("idle_2", "explore_archive")).not.toBe(
      planningEpisodeProposalId("idle_1", "explore_archive"),
    );
  });

  it("does not evaluate or write when another worker owns the live trigger lease", async () => {
    claim.mockResolvedValue({ status: "busy", receipt: receipt() });
    const result = await evaluateAndCommitKairaActivityPlanningTrigger(input());
    expect(result.status).toBe("busy");
    expect(evaluate).not.toHaveBeenCalled();
    expect(createProposal).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("persists one trigger-scoped proposal before completing the trigger", async () => {
    const order: string[] = [];
    claim.mockImplementation(async () => {
      order.push("claim");
      return { status: "claimed", receipt: receipt() };
    });
    evaluate.mockImplementation(() => {
      order.push("evaluate");
      return selectedEvaluation();
    });
    createProposal.mockImplementation(async (record: any) => {
      order.push("proposal");
      expect(record.proposalId).toBe("planning:idle_1:explore_archive");
      expect(record.selected.candidate.proposalId).toBe("planning:idle_1:explore_archive");
      expect(record.selected.candidate.evidenceIds).toContain("planning_trigger:idle_1");
      return { status: "created", record };
    });
    complete.mockImplementation(async () => {
      order.push("complete");
      return receipt("completed");
    });

    const result = await evaluateAndCommitKairaActivityPlanningTrigger(input());
    expect(result.status).toBe("completed_selected");
    expect(order).toEqual(["claim", "evaluate", "proposal", "complete"]);
  });

  it("does not complete the trigger when durable proposal persistence fails", async () => {
    claim.mockResolvedValue({ status: "claimed", receipt: receipt() });
    evaluate.mockReturnValue(selectedEvaluation());
    createProposal.mockRejectedValue(new Error("firestore down"));

    await expect(evaluateAndCommitKairaActivityPlanningTrigger(input())).rejects.toThrow("firestore down");
    expect(complete).not.toHaveBeenCalled();
  });

  it("completes a canonical no-op planning outcome without creating a proposal", async () => {
    claim.mockResolvedValue({ status: "claimed", receipt: receipt() });
    evaluate.mockReturnValue({
      status: "suppressed",
      triggerDecision: { status: "suppressed", reason: "active_execution" },
      candidateRuntime: null,
      planning: null,
    });
    complete.mockResolvedValue(receipt("completed"));

    const result = await evaluateAndCommitKairaActivityPlanningTrigger(input());
    expect(result.status).toBe("completed_none");
    expect(createProposal).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
