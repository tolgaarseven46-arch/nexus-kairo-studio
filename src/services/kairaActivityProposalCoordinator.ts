import {
  planKairaActivityProposal,
  type KairaActivityPlanningDecision,
  type KairaActivityPlanningPolicy,
  type KairaActivityProposalCandidate,
} from "./kairaActivityPlanningPolicy";
import { createKairaActivityProposalRecord, type KairaActivityProposalRecord } from "./kairaActivityProposalRecord";
import {
  createKairaActivityProposalAtomic,
  markKairaActivityProposalMaterializedAtomic,
  type KairaActivityProposalCreateResult,
} from "./kairaActivityProposalStore";
import { planKairaActivityExecution, type KairaActivityPlanResult } from "./kairaActivityExecutionCoordinator";
import {
  createKairaActivityScheduleAtomic,
  type KairaActivityScheduleCreateResult,
} from "./kairaActivityScheduleStore";
import type { KairaInstanceContext } from "./kairaInstanceContext";

export type KairaActivityProposalPlanningResult =
  | { status: "none"; decision: Extract<KairaActivityPlanningDecision, { status: "none" }> }
  | {
      status: "selected";
      decision: Extract<KairaActivityPlanningDecision, { status: "selected" }>;
      proposal: KairaActivityProposalCreateResult;
    };

export async function selectAndPersistKairaActivityProposal(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  candidates: KairaActivityProposalCandidate[];
  now: string;
  policy?: KairaActivityPlanningPolicy;
}): Promise<KairaActivityProposalPlanningResult> {
  const decision = planKairaActivityProposal({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    candidates: input.candidates,
    ...(input.policy ? { policy: input.policy } : {}),
  });
  if (decision.status === "none") return { status: "none", decision };

  const record = createKairaActivityProposalRecord({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    selected: decision.selected,
    now: input.now,
  });
  const proposal = await createKairaActivityProposalAtomic(record);
  return { status: "selected", decision, proposal };
}

export interface KairaActivityProposalMaterializationResult {
  proposal: KairaActivityProposalRecord;
  execution: KairaActivityPlanResult;
  schedule: KairaActivityScheduleCreateResult;
}

/**
 * Converts one persisted selected proposal into downstream process authorities.
 * Ordering is intentional: execution first, schedule second, proposal projection last.
 * Every downstream create is idempotent so a partial failure can be retried safely.
 */
export async function materializeKairaActivityProposal(input: {
  proposal: KairaActivityProposalRecord;
  now: string;
}): Promise<KairaActivityProposalMaterializationResult> {
  if (input.proposal.status === "cancelled") {
    throw new Error("Cancelled Kaira activity proposal cannot materialize");
  }
  const candidate = input.proposal.selected.candidate;
  const execution = await planKairaActivityExecution({
    ownerUserId: input.proposal.ownerUserId,
    kairaInstanceId: input.proposal.kairaInstanceId,
    instanceType: input.proposal.instanceType,
    activityId: input.proposal.proposalId,
    activityType: candidate.activityType,
    ...(candidate.experienceSubject ? { experienceSubject: { ...candidate.experienceSubject } } : {}),
    permissionPolicy: candidate.permissionPolicy,
    now: input.now,
  });
  const schedule = await createKairaActivityScheduleAtomic({
    ownerUserId: input.proposal.ownerUserId,
    kairaInstanceId: input.proposal.kairaInstanceId,
    instanceType: input.proposal.instanceType,
    activityId: input.proposal.proposalId,
    notBefore: candidate.notBefore,
    ...(candidate.expiresAt ? { expiresAt: candidate.expiresAt } : {}),
    now: input.now,
  });
  const proposal = await markKairaActivityProposalMaterializedAtomic({
    record: input.proposal,
    now: input.now,
  });
  return { proposal, execution, schedule };
}
