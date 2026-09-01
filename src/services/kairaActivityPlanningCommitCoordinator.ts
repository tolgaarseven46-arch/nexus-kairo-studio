import type { KairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityPlanningPolicy } from "./kairaActivityPlanningPolicy";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import type { KairaActivityEnvironmentSnapshot } from "./kairaActivityEnvironmentAuthority";
import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";
import type { DroitDynamicState } from "../types/nexus";
import type {
  KairaLearnedActivityPreferenceSignal,
  KairaRecentActivitySignal,
} from "./kairaActivityCandidateGenerator";
import type { KairaActivityMotivationContext } from "./kairaActivityMotivation";
import type { KairaActivityPlanningTrigger } from "./kairaActivityPlanningTrigger";
import {
  claimKairaActivityPlanningTrigger,
  completeKairaActivityPlanningTrigger,
  type KairaActivityPlanningTriggerClaimResult,
  type KairaActivityPlanningTriggerReceipt,
} from "./kairaActivityPlanningTriggerStore";
import { evaluateTriggeredKairaActivityPlanning } from "./kairaActivityPlanningRuntime";
import { createKairaActivityProposalRecord, type KairaActivityProposalRecord } from "./kairaActivityProposalRecord";
import {
  createKairaActivityProposalAtomic,
  type KairaActivityProposalCreateResult,
} from "./kairaActivityProposalStore";

const key = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

export function planningEpisodeProposalId(triggerId: string, candidateProposalId: string): string {
  const trigger = key(triggerId);
  const candidate = key(candidateProposalId);
  if (!trigger || !candidate) throw new Error("Invalid Kaira planning episode proposal identity");
  return `planning:${trigger}:${candidate}`.slice(0, 120);
}

export interface KairaActivityPlanningCommitInput {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  catalog: KairaActivityCatalogEntry[];
  environment: KairaActivityEnvironmentSnapshot;
  activeExecutions: KairaActivityExecutionRecord[];
  schedules: KairaActivityScheduleRecord[];
  dynamicState: DroitDynamicState;
  motivationContext?: KairaActivityMotivationContext;
  learnedPreferences?: KairaLearnedActivityPreferenceSignal[];
  recentActivities?: KairaRecentActivitySignal[];
  policy?: KairaActivityPlanningPolicy;
  lastPlanningEvaluationAt?: string;
  now: string;
  leaseMinutes?: number;
  cooldownMinutes?: number;
  upcomingScheduleBlockMinutes?: number;
  maxEnvironmentAgeMinutes?: number;
  defaultWindowMinutes?: number;
}

export type KairaActivityPlanningCommitResult =
  | {
      status: "busy" | "replayed";
      claim: KairaActivityPlanningTriggerClaimResult;
      triggerReceipt: KairaActivityPlanningTriggerReceipt;
    }
  | {
      status: "completed_none";
      claim: KairaActivityPlanningTriggerClaimResult;
      triggerReceipt: KairaActivityPlanningTriggerReceipt;
      evaluation: ReturnType<typeof evaluateTriggeredKairaActivityPlanning>;
    }
  | {
      status: "completed_selected";
      claim: KairaActivityPlanningTriggerClaimResult;
      triggerReceipt: KairaActivityPlanningTriggerReceipt;
      evaluation: Extract<ReturnType<typeof evaluateTriggeredKairaActivityPlanning>, { status: "evaluated" }>;
      proposal: KairaActivityProposalCreateResult;
    };

/**
 * Retry/concurrency-safe bridge from one canonical planning trigger to at most one
 * persisted proposal episode. Planning remains pure; proposal persistence remains
 * proposal-owned. The trigger is completed only after the durable outcome exists.
 */
export async function evaluateAndCommitKairaActivityPlanningTrigger(
  input: KairaActivityPlanningCommitInput,
): Promise<KairaActivityPlanningCommitResult> {
  const claim = await claimKairaActivityPlanningTrigger({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    trigger: input.trigger,
    now: input.now,
    ...(input.leaseMinutes ? { leaseMinutes: input.leaseMinutes } : {}),
  });

  if (claim.status === "busy" || claim.status === "replayed") {
    return { status: claim.status, claim, triggerReceipt: claim.receipt };
  }

  const evaluation = evaluateTriggeredKairaActivityPlanning({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    trigger: input.trigger,
    catalog: input.catalog,
    environment: input.environment,
    activeExecutions: input.activeExecutions,
    schedules: input.schedules,
    dynamicState: input.dynamicState,
    now: input.now,
    ...(input.motivationContext ? { motivationContext: input.motivationContext } : {}),
    ...(input.learnedPreferences ? { learnedPreferences: input.learnedPreferences } : {}),
    ...(input.recentActivities ? { recentActivities: input.recentActivities } : {}),
    ...(input.policy ? { policy: input.policy } : {}),
    ...(input.lastPlanningEvaluationAt ? { lastPlanningEvaluationAt: input.lastPlanningEvaluationAt } : {}),
    ...(input.cooldownMinutes ? { cooldownMinutes: input.cooldownMinutes } : {}),
    ...(input.upcomingScheduleBlockMinutes ? { upcomingScheduleBlockMinutes: input.upcomingScheduleBlockMinutes } : {}),
    ...(input.maxEnvironmentAgeMinutes ? { maxEnvironmentAgeMinutes: input.maxEnvironmentAgeMinutes } : {}),
    ...(input.defaultWindowMinutes ? { defaultWindowMinutes: input.defaultWindowMinutes } : {}),
  });

  if (evaluation.status !== "evaluated" || evaluation.planning.status === "none") {
    const triggerReceipt = await completeKairaActivityPlanningTrigger({
      kairaInstanceId: input.kairaInstanceId,
      instanceType: input.instanceType,
      trigger: input.trigger,
      now: input.now,
      outcome: { kind: "none" },
    });
    return { status: "completed_none", claim, triggerReceipt, evaluation };
  }

  const selected = evaluation.planning.selected;
  const episodeId = planningEpisodeProposalId(input.trigger.triggerId, selected.proposalId);
  const episodeSelected = {
    ...selected,
    proposalId: episodeId,
    candidate: {
      ...selected.candidate,
      proposalId: episodeId,
      evidenceIds: Array.from(new Set([
        ...selected.candidate.evidenceIds,
        `planning_trigger:${key(input.trigger.triggerId)}`,
        `planning_source:${key(input.trigger.sourceId)}`,
      ])),
      ...(selected.candidate.experienceSubject
        ? { experienceSubject: { ...selected.candidate.experienceSubject } }
        : {}),
    },
    components: { ...selected.components },
  };
  const record: KairaActivityProposalRecord = createKairaActivityProposalRecord({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    selected: episodeSelected,
    now: input.now,
  });
  const proposal = await createKairaActivityProposalAtomic(record);

  const triggerReceipt = await completeKairaActivityPlanningTrigger({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    trigger: input.trigger,
    now: input.now,
    outcome: { kind: "selected", proposalId: episodeId },
  });
  return { status: "completed_selected", claim, triggerReceipt, evaluation, proposal };
}
