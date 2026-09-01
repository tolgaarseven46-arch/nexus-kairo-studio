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

/**
 * Pure runtime seam. Upstream authorities own preference/history loading and
 * descriptor discovery; this adapter only derives motivation and candidates.
 */
export function generateKairaActivityCandidatesForRuntime(
  input: KairaActivityCandidateRuntimeCommonInput & { descriptors: KairaActivityDescriptor[] },
): KairaActivityCandidateRuntimeResult {
  if (!instancePolicy(input.instanceType).autonomousActivityPlanning) {
    return {
      status: "disabled",
      reason: "autonomous_activity_planning_disabled",
      motivation: null,
      candidates: [],
    };
  }

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
  if (!instancePolicy(input.instanceType).autonomousActivityPlanning) {
    return {
      status: "disabled",
      reason: "autonomous_activity_planning_disabled",
      motivation: null,
      candidates: [],
    };
  }

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
