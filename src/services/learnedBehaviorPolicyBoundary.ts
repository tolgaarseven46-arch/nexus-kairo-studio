import type {
  BehaviorContract,
  BehaviorPermission,
  RepairStatus,
} from "./behaviorContract";

export interface LearnedBehaviorProposal {
  continueConversation?: boolean;
  playfulness?: BehaviorPermission;
  affection?: BehaviorPermission;
  questions?: BehaviorPermission;
  forgivenessGranted?: boolean;
  reopeningCloseness?: BehaviorPermission;
  maxResponseLength?: "short" | "medium";
  repairStatus?: RepairStatus;
}

const restrictPermission = (
  base: BehaviorPermission,
  proposed?: BehaviorPermission,
): BehaviorPermission => {
  if (base === "forbidden") return "forbidden";
  return proposed === "forbidden" ? "forbidden" : "allowed";
};

/**
 * Learned policies may specialize/restrict an authoritative BehaviorContract,
 * but they may never relax it. Relationship/appraisal state remains owned by
 * deterministic authority; a model proposal cannot reopen forbidden behavior.
 */
export function constrainLearnedBehaviorProposal(
  base: BehaviorContract,
  proposal: LearnedBehaviorProposal,
): BehaviorContract {
  const continueConversation = base.continueConversation && proposal.continueConversation !== false;
  const playfulness = restrictPermission(base.playfulness, proposal.playfulness);
  const affection = restrictPermission(base.affection, proposal.affection);
  const questions = restrictPermission(base.questions, proposal.questions);
  const reopeningCloseness = restrictPermission(base.reopeningCloseness, proposal.reopeningCloseness);
  const forgivenessGranted = base.forgivenessGranted && proposal.forgivenessGranted !== false;
  const maxResponseLength =
    base.maxResponseLength === "short" || proposal.maxResponseLength === "short"
      ? "short"
      : "medium";

  let repairStatus = base.repairStatus;
  if (base.repairStatus === "repaired") {
    repairStatus = proposal.repairStatus ?? base.repairStatus;
  } else if (proposal.repairStatus && proposal.repairStatus !== "repaired") {
    repairStatus = proposal.repairStatus;
  }

  return {
    ...base,
    continueConversation,
    playfulness,
    affection,
    questions,
    forgivenessGranted,
    reopeningCloseness,
    maxResponseLength,
    repairStatus,
    reasons: [
      ...base.reasons,
      "Learned behavior proposal authoritative contract tarafından yalnızca kısıtlayıcı yönde uygulandı.",
    ],
  };
}

export interface LearnedPolicyBoundaryIssue {
  invariant: string;
  message: string;
}

export function validateLearnedPolicyBoundary(
  base: BehaviorContract,
  constrained: BehaviorContract,
): LearnedPolicyBoundaryIssue[] {
  const issues: LearnedPolicyBoundaryIssue[] = [];

  for (const key of ["playfulness", "affection", "questions", "reopeningCloseness"] as const) {
    if (base[key] === "forbidden" && constrained[key] !== "forbidden") {
      issues.push({
        invariant: "learned_policy.no_permission_reopen",
        message: `${key} authoritative forbidden durumundan yeniden açıldı.`,
      });
    }
  }

  if (!base.continueConversation && constrained.continueConversation) {
    issues.push({
      invariant: "learned_policy.no_conversation_reopen",
      message: "Learned policy kapalı konuşmayı yeniden açtı.",
    });
  }

  if (!base.forgivenessGranted && constrained.forgivenessGranted) {
    issues.push({
      invariant: "learned_policy.no_early_forgiveness",
      message: "Learned policy authoritative olmayan affetme üretti.",
    });
  }

  if (base.maxResponseLength === "short" && constrained.maxResponseLength !== "short") {
    issues.push({
      invariant: "learned_policy.no_length_relaxation",
      message: "Learned policy kısa cevap sınırını genişletti.",
    });
  }

  if (base.repairStatus !== "repaired" && constrained.repairStatus === "repaired") {
    issues.push({
      invariant: "learned_policy.no_false_repair",
      message: "Learned policy tamamlanmamış onarımı repaired yaptı.",
    });
  }

  return issues;
}
