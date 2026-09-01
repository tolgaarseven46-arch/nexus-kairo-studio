import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ create: vi.fn(), command: vi.fn() }));
const world = vi.hoisted(() => ({ save: vi.fn() }));
const experience = vi.hoisted(() => ({ complete: vi.fn() }));

vi.mock("./kairaActivityExecutionStore", () => ({
  createKairaActivityExecutionAtomic: store.create,
  applyKairaActivityExecutionCommandAtomic: store.command,
}));
vi.mock("./worldModelEventStore", () => ({
  saveKairaActivityWorldObservation: world.save,
}));
vi.mock("./kairaActivityExperienceCoordinator", () => ({
  recordCompletedKairaActivityExperience: experience.complete,
}));

import {
  applyKairaActivityExecutionCommand,
  planKairaActivityExecution,
} from "./kairaActivityExecutionCoordinator";

const record = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activityId: "theatre_01",
  activityType: "theatre",
  experienceSubject: {
    preferenceKey: "preferred_performance_type",
    experiencedValue: "theatre",
  },
  phase: "planned" as const,
  permissionPolicy: "owner_approval" as const,
  permissionStatus: "pending" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  ...overrides,
});

const observation = (status: string) => ({
  id: `obs_${status}`,
  kind: "kaira_activity" as const,
  activity: {
    activityId: "theatre_01",
    activityType: "theatre",
    status,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Kaira activity execution coordinator contracts", () => {
  it("persists process authority before projecting planned world history", async () => {
    const execution = record();
    store.create.mockResolvedValue({ status: "created", record: execution });
    world.save.mockResolvedValue(observation("planned"));

    const result = await planKairaActivityExecution({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      activityType: "theatre",
      experienceSubject: execution.experienceSubject,
      permissionPolicy: "owner_approval",
      now: "2026-09-02T00:00:00.000Z",
    });

    expect(store.create.mock.invocationCallOrder[0]).toBeLessThan(world.save.mock.invocationCallOrder[0]);
    expect(world.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: "owner_1",
      kairaInstanceId: "kaira_a",
      sessionId: "activity:theatre_01",
      activity: expect.objectContaining({
        activityId: "theatre_01",
        status: "planned",
        experienceSubject: execution.experienceSubject,
      }),
    }));
    expect(result.executionStatus).toBe("created");
  });

  it("does not project rejected execution commands into world history", async () => {
    store.command.mockResolvedValue({
      status: "rejected",
      record: record(),
      reason: "permission_required",
    });
    const result = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "start", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:01:00.000Z",
    });
    expect(result.execution.status).toBe("rejected");
    expect(world.save).not.toHaveBeenCalled();
    expect(experience.complete).not.toHaveBeenCalled();
  });

  it("keeps permission decisions in process state rather than inventing activity lifecycle history", async () => {
    store.command.mockResolvedValue({
      status: "applied",
      record: record({ permissionStatus: "granted" }),
    });
    await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: {
        type: "grant_permission",
        authority: "activity_permission_controller",
        decidedByUserId: "owner_1",
      },
      now: "2026-09-02T00:01:00.000Z",
    });
    expect(world.save).not.toHaveBeenCalled();
  });

  it("projects active/cancelled/failed lifecycle only after canonical process transition", async () => {
    for (const [command, phase, status] of [
      [{ type: "start", authority: "kaira_activity_executor" } as const, "active", "active"],
      [{ type: "cancel", authority: "kaira_activity_executor" } as const, "cancelled", "cancelled"],
      [{ type: "fail", authority: "kaira_activity_executor" } as const, "failed", "failed"],
    ] as const) {
      vi.clearAllMocks();
      store.command.mockResolvedValue({ status: "applied", record: record({ phase }) });
      world.save.mockResolvedValue(observation(status));
      await applyKairaActivityExecutionCommand({
        ownerUserId: "owner_1",
        kairaInstanceId: "kaira_a",
        activityId: "theatre_01",
        command,
        now: "2026-09-02T00:02:00.000Z",
      });
      expect(store.command.mock.invocationCallOrder[0]).toBeLessThan(world.save.mock.invocationCallOrder[0]);
      expect(world.save).toHaveBeenCalledWith(expect.objectContaining({
        activity: expect.objectContaining({ status }),
      }));
    }
  });

  it("routes completed activity with outcome through the existing completed-experience authority", async () => {
    const completedRecord = record({ phase: "completed", completedAt: "2026-09-02T00:20:00.000Z" });
    store.command.mockResolvedValue({ status: "applied", record: completedRecord });
    const completed = {
      observation: observation("completed"),
      receipt: { sourceWorldObservationId: "obs_completed" },
      consolidation: { status: "consolidated" },
    };
    experience.complete.mockResolvedValue(completed);

    const result = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "complete", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:20:00.000Z",
      outcome: { outcomeValence: 0.8, appraisalConfidence: 0.9, attributionConfidence: 0.9 },
    });

    expect(store.command.mock.invocationCallOrder[0]).toBeLessThan(experience.complete.mock.invocationCallOrder[0]);
    expect(experience.complete).toHaveBeenCalledWith(expect.objectContaining({
      authority: "kaira_activity_executor",
      userId: "owner_1",
      activityId: "theatre_01",
      experienceSubject: completedRecord.experienceSubject,
    }));
    expect(result.completedExperience).toBe(completed);
  });

  it("records completion truth even when no outcome appraisal is available yet", async () => {
    store.command.mockResolvedValue({ status: "applied", record: record({ phase: "completed" }) });
    world.save.mockResolvedValue(observation("completed"));
    const result = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "complete", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:20:00.000Z",
    });
    expect(world.save).toHaveBeenCalledWith(expect.objectContaining({
      activity: expect.objectContaining({ status: "completed" }),
    }));
    expect(experience.complete).not.toHaveBeenCalled();
    expect(result.worldObservation).toEqual(observation("completed"));
  });

  it("allows exact completion replay to retry downstream experience consolidation without reopening state", async () => {
    const completedRecord = record({ phase: "completed" });
    store.command.mockResolvedValue({ status: "replayed", record: completedRecord });
    experience.complete.mockResolvedValue({
      observation: observation("completed"),
      receipt: { sourceWorldObservationId: "obs_completed" },
      consolidation: { status: "duplicate" },
    });
    const result = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "complete", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:21:00.000Z",
      outcome: { outcomeValence: 0.8, appraisalConfidence: 0.9, attributionConfidence: 0.9 },
    });
    expect(result.execution.status).toBe("replayed");
    expect(experience.complete).toHaveBeenCalledTimes(1);
  });
});
