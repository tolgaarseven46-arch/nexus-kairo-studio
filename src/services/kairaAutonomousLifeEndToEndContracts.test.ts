import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DroitDynamicState } from "../types/nexus";

const state = vi.hoisted(() => ({
  proposals: new Map<string, any>(),
  executions: new Map<string, any>(),
  schedules: new Map<string, any>(),
  memories: [] as any[],
  revisionFactKeys: [] as string[],
  worldObservations: [] as any[],
  observationSeq: 0,
}));

vi.mock("./kairaActivityProposalStore", async () => {
  const recordModule = await import("./kairaActivityProposalRecord");
  return {
    createKairaActivityProposalAtomic: vi.fn(async (record: any) => {
      const existing = state.proposals.get(record.proposalId);
      if (existing) return { status: "existing", record: existing };
      state.proposals.set(record.proposalId, record);
      return { status: "created", record };
    }),
    markKairaActivityProposalMaterializedAtomic: vi.fn(async ({ record, now }: any) => {
      const next = recordModule.markKairaActivityProposalMaterialized(record, now);
      state.proposals.set(next.proposalId, next);
      return next;
    }),
  };
});

vi.mock("./kairaActivityExecutionStore", async () => {
  const executionModule = await import("./kairaActivityExecution");
  return {
    createKairaActivityExecutionAtomic: vi.fn(async (input: any) => {
      const created = executionModule.createKairaActivityExecution(input);
      const existing = state.executions.get(created.activityId);
      if (existing) return { status: "existing", record: existing };
      state.executions.set(created.activityId, created);
      return { status: "created", record: created };
    }),
    applyKairaActivityExecutionCommandAtomic: vi.fn(async (input: any) => {
      const current = state.executions.get(input.activityId);
      if (!current) throw new Error("Kaira activity execution not found");
      const decision = executionModule.transitionKairaActivityExecution(current, input.command, input.now);
      if (decision.status === "applied") state.executions.set(input.activityId, decision.record);
      return decision;
    }),
  };
});

vi.mock("./kairaActivityScheduleStore", () => ({
  createKairaActivityScheduleAtomic: vi.fn(async (input: any) => {
    const record = {
      schemaVersion: 1,
      ownerUserId: input.ownerUserId,
      kairaInstanceId: input.kairaInstanceId,
      instanceType: input.instanceType,
      activityId: input.activityId,
      status: "scheduled",
      notBefore: input.notBefore,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      createdAt: input.now,
      updatedAt: input.now,
    };
    const existing = state.schedules.get(input.activityId);
    if (existing) return { status: "existing", record: existing };
    state.schedules.set(input.activityId, record);
    return { status: "created", record };
  }),
}));

vi.mock("./kairaActivityPlanningTriggerInboxStore", () => ({
  enqueueKairaActivityPlanningTriggerAtomic: vi.fn(async (input: any) => ({
    status: "enqueued",
    record: {
      schemaVersion: 1,
      ownerUserId: input.ownerUserId,
      kairaInstanceId: input.kairaInstanceId,
      instanceType: input.instanceType,
      trigger: input.trigger,
      status: "pending",
      enqueuedAt: input.now,
    },
  })),
}));

vi.mock("./worldModelEventStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./worldModelEventStore")>();
  return {
    ...actual,
    saveKairaActivityWorldObservation: vi.fn(async (input: any) => {
      state.observationSeq += 1;
      const activityId = String(input.activity.activityId).trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_:-]+/g, "_");
      const activityType = String(input.activity.activityType).trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_:-]+/g, "_");
      const preferenceKey = input.activity.experienceSubject
        ? String(input.activity.experienceSubject.preferenceKey).trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_:-]+/g, "_")
        : undefined;
      const observation = {
        id: `e2e_obs_${state.observationSeq}`,
        userId: input.userId,
        kairaInstanceId: input.kairaInstanceId,
        sessionId: input.sessionId,
        kind: "kaira_activity" as const,
        status: "grounded" as const,
        createdAt: `2026-09-02T12:0${Math.min(state.observationSeq, 9)}:00.000Z`,
        event: {
          raw: `kaira_activity:${activityType}:${input.activity.status}`,
          eventType: "general" as const,
          reportedSpeech: false,
          certainty: 1,
          ambiguities: [],
          evidence: ["authority:kaira_activity_executor"],
        },
        activity: {
          activityId,
          activityType,
          status: input.activity.status,
          ...(input.activity.experienceSubject
            ? {
                experienceSubject: {
                  preferenceKey,
                  experiencedValue:
                    typeof input.activity.experienceSubject.experiencedValue === "string"
                      ? input.activity.experienceSubject.experiencedValue.trim()
                      : input.activity.experienceSubject.experiencedValue,
                },
              }
            : {}),
        },
      };
      state.worldObservations.push(observation);
      return observation;
    }),
  };
});

vi.mock("./kairaCanonicalIdentityStore", () => ({
  appendKairaAutobiographicalMemoryAtomic: vi.fn(async (_instance: any, memory: any) => {
    const duplicate = state.memories.find((entry) => entry.consolidationKey === memory.consolidationKey);
    if (duplicate) return { status: "duplicate", memoryId: duplicate.id };
    state.memories.push(memory);
    return { status: "appended", memoryId: memory.id };
  }),
  applyKairaSelfFactRevisionAtomic: vi.fn(async (_instance: any, factKey: string) => {
    state.revisionFactKeys.push(factKey);
    return {
      status: "unchanged",
      decision: { status: "insufficient_evidence", factKey },
    };
  }),
}));

import { evaluateTriggeredKairaActivityPlanning } from "./kairaActivityPlanningRuntime";
import {
  selectAndPersistKairaActivityProposal,
  materializeKairaActivityProposal,
} from "./kairaActivityProposalCoordinator";
import { applyKairaActivityExecutionCommand } from "./kairaActivityExecutionCoordinator";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";

const NOW = "2026-09-02T12:05:00.000Z";
const dynamicState: DroitDynamicState = {
  calmness: 82,
  anger: 4,
  stress: 8,
  happiness: 72,
  confidence: 74,
  surprise: 8,
  lastStatus: "stable",
};
const catalog: KairaActivityCatalogEntry[] = [{
  catalogId: "experience_archive",
  activityType: "archive_exploration",
  motivationAffinity: { curiosity: 1, growth: 0.7 },
  preferenceKeys: ["preferred_archive_mode"],
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.9,
  permissionPolicy: "owner_approval",
  experienceSubject: {
    preferenceKey: "preferred_archive_mode",
    experiencedValue: "deep_exploration",
  },
  evidenceIds: ["catalog:archive_exploration"],
}];
const environment = {
  schemaVersion: 1 as const,
  kairaInstanceId: "kaira_e2e",
  observedAt: "2026-09-02T12:00:00.000Z",
  entries: [{
    catalogId: "experience_archive",
    accessible: true,
    capabilities: { world_access: true },
    contextFit: 0.95,
    risk: 0.05,
    evidenceIds: ["environment:archive_access"],
  }],
};

beforeEach(() => {
  state.proposals.clear();
  state.executions.clear();
  state.schedules.clear();
  state.memories.length = 0;
  state.revisionFactKeys.length = 0;
  state.worldObservations.length = 0;
  state.observationSeq = 0;
});

describe("Autonomous Life E2E v1", () => {
  it("moves one Kaira-owned experience from environment truth to autobiography and self-revision evidence", async () => {
    const planning = evaluateTriggeredKairaActivityPlanning({
      kairaInstanceId: "kaira_e2e",
      instanceType: "individual",
      trigger: {
        triggerId: "idle_e2e_1",
        kind: "idle_transition",
        sourceId: "presence_e2e_1",
        occurredAt: "2026-09-02T12:04:30.000Z",
        previousBusy: true,
        currentBusy: false,
      },
      catalog,
      environment,
      activeExecutions: [],
      schedules: [],
      dynamicState,
      now: NOW,
      motivationContext: { stimulationNeed: 0.95, availableBandwidth: 0.95 },
    });

    expect(planning.status).toBe("evaluated");
    if (planning.status !== "evaluated") throw new Error("planning unexpectedly suppressed");
    expect(planning.candidateRuntime.status).toBe("generated");
    expect(planning.candidateRuntime.candidates).toHaveLength(1);
    expect(planning.planning.status).toBe("selected");

    const persisted = await selectAndPersistKairaActivityProposal({
      ownerUserId: "owner_e2e",
      kairaInstanceId: "kaira_e2e",
      instanceType: "individual",
      candidates: planning.candidateRuntime.candidates,
      now: NOW,
    });
    expect(persisted.status).toBe("selected");
    if (persisted.status !== "selected") throw new Error("proposal unexpectedly absent");

    const proposal = persisted.proposal.record;
    expect(proposal.selected.candidate.evidenceIds).toEqual(expect.arrayContaining([
      "catalog:archive_exploration",
      "environment:archive_access",
      "capability:world_access",
    ]));

    const materialized = await materializeKairaActivityProposal({
      proposal,
      now: "2026-09-02T12:06:00.000Z",
    });
    expect(materialized.proposal.status).toBe("materialized");
    expect(materialized.execution.execution.phase).toBe("planned");
    expect(materialized.execution.execution.permissionStatus).toBe("pending");
    expect(materialized.schedule.record.status).toBe("scheduled");

    const activityId = proposal.proposalId;
    const granted = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_e2e",
      kairaInstanceId: "kaira_e2e",
      activityId,
      command: {
        type: "grant_permission",
        authority: "activity_permission_controller",
        decidedByUserId: "owner_e2e",
      },
      now: "2026-09-02T12:07:00.000Z",
    });
    expect(granted.execution.status).toBe("applied");
    expect(granted.execution.record.permissionStatus).toBe("granted");

    const started = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_e2e",
      kairaInstanceId: "kaira_e2e",
      activityId,
      command: { type: "start", authority: "kaira_activity_executor" },
      now: "2026-09-02T12:08:00.000Z",
    });
    expect(started.execution.status).toBe("applied");
    expect(started.execution.record.phase).toBe("active");

    const completed = await applyKairaActivityExecutionCommand({
      ownerUserId: "owner_e2e",
      kairaInstanceId: "kaira_e2e",
      activityId,
      command: { type: "complete", authority: "kaira_activity_executor" },
      now: "2026-09-02T12:30:00.000Z",
      outcome: {
        outcomeValence: 0.9,
        appraisalConfidence: 0.95,
        attributionConfidence: 0.92,
      },
    });

    expect(completed.execution.status).toBe("applied");
    expect(completed.execution.record.phase).toBe("completed");
    expect(completed.completedExperience?.receipt).toMatchObject({
      authority: "kaira_activity_executor",
      activityId,
      kairaInstanceId: "kaira_e2e",
      status: "completed",
      preferenceProbe: {
        preferenceKey: "preferred_archive_mode",
        experiencedValue: "deep_exploration",
      },
    });
    expect(completed.completedExperience?.consolidation).toMatchObject({
      status: "consolidated",
      experiencePreferenceStatus: "projected",
      selfRevisionFactKey: "preferred_archive_mode",
    });
    expect(completed.planningTriggerInbox).toMatchObject({
      status: "enqueued",
      record: {
        kairaInstanceId: "kaira_e2e",
        trigger: {
          kind: "execution_terminal",
          terminalPhase: "completed",
        },
      },
    });

    expect(state.memories).toHaveLength(1);
    expect(state.memories[0]).toMatchObject({
      origin: "lived",
      eventType: "activity:archive_exploration",
      canonical: true,
      selfRevisionEvidence: {
        factKey: "preferred_archive_mode",
        domain: "preference",
      },
    });
    expect(state.memories[0].sourceWorldObservationIds).toEqual([
      completed.completedExperience?.observation.id,
    ]);
    expect(state.revisionFactKeys).toEqual(["preferred_archive_mode"]);

    expect(state.worldObservations.map((item) => item.activity.status)).toEqual([
      "planned",
      "active",
      "completed",
    ]);
    expect(state.worldObservations.at(-1)?.id).toBe(completed.completedExperience?.receipt.sourceWorldObservationId);
  });
});
