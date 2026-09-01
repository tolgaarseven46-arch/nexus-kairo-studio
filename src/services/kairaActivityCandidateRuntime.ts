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

/**
 * Pure runtime seam. Upstream authorities own preference/history loading and
 * descriptor discovery; this adapter only derives motivation and candidates.
 */
export function generateKairaActivityCandidatesForRuntime(input: {
  instanceType: KairaInstanceContext["instanceType"];
  dynamicState: DroitDynamicState;
  descriptors: KairaActivityDescriptor[];
  motivationContext?: KairaActivityMotivationContext;
  learnedPreferences?: KairaLearnedActivityPreferenceSignal[];
  recentActivities?: KairaRecentActivitySignal[];
}): KairaActivityCandidateRuntimeResult {
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
