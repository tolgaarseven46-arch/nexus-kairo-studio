import type { DroitDynamicState } from "../types/nexus";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import type { KairaActivityEnvironmentSnapshot } from "./kairaActivityEnvironmentAuthority";
import type {
  KairaLearnedActivityPreferenceSignal,
  KairaRecentActivitySignal,
} from "./kairaActivityCandidateGenerator";
import type { KairaActivityMotivationContext } from "./kairaActivityMotivation";
import {
  generateKairaActivityCandidatesFromEnvironmentForRuntime,
  type KairaActivityCandidateRuntimeResult,
} from "./kairaActivityCandidateRuntime";
import {
  planKairaActivityProposal,
  type KairaActivityPlanningDecision,
  type KairaActivityPlanningPolicy,
} from "./kairaActivityPlanningPolicy";
import {
  evaluateKairaActivityPlanningTrigger,
  type KairaActivityPlanningTrigger,
  type KairaActivityPlanningTriggerDecision,
} from "./kairaActivityPlanningTrigger";

export interface KairaActivityTriggeredPlanningInput {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  catalog: KairaActivityCatalogEntry[];
  environment: KairaActivityEnvironmentSnapshot;
  activeExecutions: KairaActivityExecutionRecord[];
  schedules: KairaActivityScheduleRecord[];
  dynamicState: DroitDynamicState;
  now: string;
  lastPlanningEvaluationAt?: string;
  cooldownMinutes?: number;
  upcomingScheduleBlockMinutes?: number;
  maxEnvironmentAgeMinutes?: number;
  defaultWindowMinutes?: number;
  motivationContext?: KairaActivityMotivationContext;
  learnedPreferences?: KairaLearnedActivityPreferenceSignal[];
  recentActivities?: KairaRecentActivitySignal[];
  policy?: KairaActivityPlanningPolicy;
}

export type KairaActivityTriggeredPlanningResult =
  | {
      status: "suppressed";
      triggerDecision: Extract<KairaActivityPlanningTriggerDecision, { status: "suppressed" }>;
      candidateRuntime: null;
      planning: null;
    }
  | {
      status: "evaluated";
      triggerDecision: Extract<KairaActivityPlanningTriggerDecision, { status: "evaluate" }>;
      candidateRuntime: KairaActivityCandidateRuntimeResult;
      planning: KairaActivityPlanningDecision;
    };

/**
 * Highest pure autonomous-planning evaluation seam. Trigger policy decides
 * whether evaluation may run; environment/runtime authorities produce candidates;
 * planning policy compares them. No proposal, schedule, execution or memory write
 * occurs here, so retries remain side-effect free until a downstream commit seam.
 */
export function evaluateTriggeredKairaActivityPlanning(
  input: KairaActivityTriggeredPlanningInput,
): KairaActivityTriggeredPlanningResult {
  const triggerDecision = evaluateKairaActivityPlanningTrigger({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    trigger: input.trigger,
    activeExecutions: input.activeExecutions,
    schedules: input.schedules,
    now: input.now,
    lastPlanningEvaluationAt: input.lastPlanningEvaluationAt,
    cooldownMinutes: input.cooldownMinutes,
    upcomingScheduleBlockMinutes: input.upcomingScheduleBlockMinutes,
  });
  if (triggerDecision.status === "suppressed") {
    return { status: "suppressed", triggerDecision, candidateRuntime: null, planning: null };
  }

  const candidateRuntime = generateKairaActivityCandidatesFromEnvironmentForRuntime({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    dynamicState: input.dynamicState,
    catalog: input.catalog,
    environment: input.environment,
    activeExecutions: input.activeExecutions,
    schedules: input.schedules,
    now: input.now,
    maxEnvironmentAgeMinutes: input.maxEnvironmentAgeMinutes,
    defaultWindowMinutes: input.defaultWindowMinutes,
    motivationContext: input.motivationContext,
    learnedPreferences: input.learnedPreferences,
    recentActivities: input.recentActivities,
  });

  const planning = planKairaActivityProposal({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    candidates: candidateRuntime.candidates,
    policy: input.policy,
  });
  return { status: "evaluated", triggerDecision, candidateRuntime, planning };
}
