import {
  canEnterSliceBW3,
  type SliceBW2ReviewIntake,
  type SliceBW2TrustedReviewProvenance,
} from "./sliceBW2ReviewIntake";

export interface SliceBW2ToW3TransitionPlan {
  canFreezeW3: boolean;
  unresolvedBlockerIds: string[];
  requiredRepairs: Array<{
    blockerId: string;
    minimumRepair: string;
    requiredTest: string;
  }>;
  freezeChecklist: string[];
}

const BASE_FREEZE_CHECKLIST = [
  "freeze exact ConversationGraphV1 field set",
  "freeze explicit-vs-inferred precedence",
  "freeze unanswered-turn observation rule",
  "freeze escalation evidence source contract",
  "freeze cold/warm/experienced-owner fixture definitions",
  "freeze namespace/idempotency/ordering rules",
  "reconfirm observation-only authority boundary",
] as const;

export const buildSliceBW2ToW3TransitionPlan = (
  review: SliceBW2ReviewIntake,
  provenance?: SliceBW2TrustedReviewProvenance,
): SliceBW2ToW3TransitionPlan => {
  const unresolvedBlockerIds = review.blockers.map((blocker) => blocker.id);

  return {
    canFreezeW3: canEnterSliceBW3(review, provenance),
    unresolvedBlockerIds,
    requiredRepairs: review.blockers.map((blocker) => ({
      blockerId: blocker.id,
      minimumRepair: blocker.minimumRepair,
      requiredTest: blocker.requiredTest,
    })),
    freezeChecklist: [...BASE_FREEZE_CHECKLIST],
  };
};
