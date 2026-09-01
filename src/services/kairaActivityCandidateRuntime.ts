import type { DroitDynamicState } from "../types/nexus";
import { instancePolicy, type KairaInstanceContext } from "./kairaInstanceContext";
import {
  deriveKairaActivityMotivation,
  type KairaActivityMotivationContext,
  type KairaActivityMotivationProfile,
} from "./kairaActivityMotivation";
import {
  generateKairaActivityCandidates,
  type KairaActivityDescriptor,
  type KairaLearnedActivityPreferenceSignal,
  type KairaRecentActivitySignal,
} from "./kairaActivityCandidateGenerator";
import {
  materializeKairaActivityDescriptors,
  type KairaActivityCatalogEntry,
  type KairaActivityCatalogRuntimeContext,
} from "./kairaActivityCatalogAuthority";
import {
  projectKairaActivityRuntimeFacts,
  type KairaActivityWorldRuntimeFact,
} from "./kairaActivityRuntimeFacts";
import {
  projectKairaActivityEnvironmentSnapshot,
  type KairaActivityEnvironmentSnapshot,
} from "./kairaActivityEnvironmentAuthority";
import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";
import type { KairaActivityProposalCandidate } from "./kairaActivityPlanningPolicy";

export type KairaActivityCandidateRuntimeResult =
  | {
      status: "disabled";
      reason: "autonomous_activity_planning_disabled";
      motivation: null;
      candidates: [];
    }
  | {
      status: "generated";
      motivation: KairaActivityMotivationProfile;
      candidates: KairaActivityProposalCandidate[];
    };

export interface KairaActivityCandidateRuntimeCommonInput {
  instanceType: KairaInstanceContext["instanceType"];
  dynamicState: DroitDynamicState;
  motivationContext?: KairaActivityMotivationContext;
  learnedPreferences?: KairaLearnedActivityPreferenceSignal[];
  recentActivities?: KairaRecentActivitySignal[];
}

const disabledResult = (): KairaActivityCandidateRuntimeResult => ({
  status: "disabled",
  reason: "autonomous_activity_planning_disabled",
  motivation: null,
  candidates: [],
});

/**
 * Pure runtime seam. Upstream authorities own preference/history loading and
 * descriptor discovery; this adapter only derives motivation and candidates.
 */
export function generateKairaActivityCandidatesForRuntime(
  input: KairaActivityCandidateRuntimeCommonInput & { descriptors: KairaActivityDescriptor[] },
): KairaActivityCandidateRuntimeResult {
  if (!instancePolicy(input.instanceType).autonomousActivityPlanning) return disabledResult();

  const motivation = deriveKairaActivityMotivation(input.dynamicState, input.motivationContext);
  const candidates = generateKairaActivityCandidates({
    descriptors: input.descriptors,
    motivation,
    learnedPreferences: input.learnedPreferences,
    recentActivities: input.recentActivities,
  });
  return { status: "generated", motivation, candidates };
}

/**
 * Canonical descriptor-discovery path. Catalog semantics and runtime facts are
 * joined by their dedicated authority before the existing candidate seam runs.
 * This function remains pure and performs no catalog, memory or history I/O.
 */
export function generateKairaActivityCandidatesFromCatalogForRuntime(
  input: KairaActivityCandidateRuntimeCommonInput & {
    catalog: KairaActivityCatalogEntry[];
    catalogRuntime: KairaActivityCatalogRuntimeContext;
  },
): KairaActivityCandidateRuntimeResult {
  if (!instancePolicy(input.instanceType).autonomousActivityPlanning) return disabledResult();

  const descriptors = materializeKairaActivityDescriptors({
    catalog: input.catalog,
    runtime: input.catalogRuntime,
  });
  return generateKairaActivityCandidatesForRuntime({
    instanceType: input.instanceType,
    dynamicState: input.dynamicState,
    descriptors,
    motivationContext: input.motivationContext,
    learnedPreferences: input.learnedPreferences,
    recentActivities: input.recentActivities,
  });
}

/**
 * Pure source-snapshot seam. Typed world/environment facts plus canonical
 * execution/schedule/state snapshots become ephemeral runtime assessment.
 */
export function generateKairaActivityCandidatesFromCanonicalRuntimeFacts(
  input: KairaActivityCandidateRuntimeCommonInput & {
    catalog: KairaActivityCatalogEntry[];
    worldFacts: KairaActivityWorldRuntimeFact[];
    activeExecutions: KairaActivityExecutionRecord[];
    schedules: KairaActivityScheduleRecord[];
    now: string;
    defaultWindowMinutes?: number;
  },
): KairaActivityCandidateRuntimeResult {
  if (!instancePolicy(input.instanceType).autonomousActivityPlanning) return disabledResult();

  const catalogRuntime = projectKairaActivityRuntimeFacts({
    catalog: input.catalog,
    worldFacts: input.worldFacts,
    activeExecutions: input.activeExecutions,
    schedules: input.schedules,
    dynamicState: input.dynamicState,
    now: input.now,
    defaultWindowMinutes: input.defaultWindowMinutes,
  });

  return generateKairaActivityCandidatesFromCatalogForRuntime({
    instanceType: input.instanceType,
    dynamicState: input.dynamicState,
    catalog: input.catalog,
    catalogRuntime,
    motivationContext: input.motivationContext,
    learnedPreferences: input.learnedPreferences,
    recentActivities: input.recentActivities,
  });
}

/**
 * Highest current pure discovery seam. A trusted environment snapshot owns
 * capability/access/context/risk truth; process/state snapshots only modulate
 * runtime feasibility. No raw dialogue/world-event text is parsed here.
 */
export function generateKairaActivityCandidatesFromEnvironmentForRuntime(
  input: KairaActivityCandidateRuntimeCommonInput & {
    kairaInstanceId: string;
    catalog: KairaActivityCatalogEntry[];
    environment: KairaActivityEnvironmentSnapshot;
    activeExecutions: KairaActivityExecutionRecord[];
    schedules: KairaActivityScheduleRecord[];
    now: string;
    maxEnvironmentAgeMinutes?: number;
    defaultWindowMinutes?: number;
  },
): KairaActivityCandidateRuntimeResult {
  if (!instancePolicy(input.instanceType).autonomousActivityPlanning) return disabledResult();

  const worldFacts = projectKairaActivityEnvironmentSnapshot({
    kairaInstanceId: input.kairaInstanceId,
    catalog: input.catalog,
    snapshot: input.environment,
    now: input.now,
    maxAgeMinutes: input.maxEnvironmentAgeMinutes,
  });

  return generateKairaActivityCandidatesFromCanonicalRuntimeFacts({
    instanceType: input.instanceType,
    dynamicState: input.dynamicState,
    catalog: input.catalog,
    worldFacts,
    activeExecutions: input.activeExecutions,
    schedules: input.schedules,
    now: input.now,
    defaultWindowMinutes: input.defaultWindowMinutes,
    motivationContext: input.motivationContext,
    learnedPreferences: input.learnedPreferences,
    recentActivities: input.recentActivities,
  });
}
