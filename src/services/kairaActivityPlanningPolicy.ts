import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import type {
  KairaActivityExecutionExperienceSubject,
  KairaActivityPermissionPolicy,
} from "./kairaActivityExecution";

export type KairaActivityMotivationKind =
  | "curiosity"
  | "recreation"
  | "growth"
  | "rest"
  | "social"
  | "self_goal";

export interface KairaActivityProposalCandidate {
  proposalId: string;
  activityType: string;
  experienceSubject?: KairaActivityExecutionExperienceSubject;
  motivation: {
    kind: KairaActivityMotivationKind;
    strength: number;
  };
  learnedPreference: {
    affinity: number;
    confidence: number;
  };
  noveltyFit: number;
  contextualFit: number;
  interruptionCost: number;
  risk: number;
  repetitionPressure: number;
  availability: "available" | "blocked";
  permissionPolicy: KairaActivityPermissionPolicy;
  notBefore: string;
  expiresAt?: string;
  evidenceIds: string[];
}

export interface KairaActivityPlanningPolicy {
  minimumScore: number;
  weights: {
    motivation: number;
    preference: number;
    novelty: number;
    context: number;
    interruptionCost: number;
    risk: number;
    repetition: number;
  };
}

export const DEFAULT_KAIRA_ACTIVITY_PLANNING_POLICY: KairaActivityPlanningPolicy = {
  minimumScore: 0.36,
  weights: {
    motivation: 0.28,
    preference: 0.24,
    novelty: 0.12,
    context: 0.2,
    interruptionCost: 0.06,
    risk: 0.06,
    repetition: 0.04,
  },
};

export interface KairaActivityProposalScore {
  proposalId: string;
  score: number;
  candidate: KairaActivityProposalCandidate;
  components: {
    motivation: number;
    preference: number;
    novelty: number;
    context: number;
    interruptionCost: number;
    risk: number;
    repetition: number;
  };
}

export type KairaActivityPlanningDecision =
  | {
      status: "selected";
      selected: KairaActivityProposalScore;
      ranked: KairaActivityProposalScore[];
    }
  | {
      status: "none";
      reason: "no_candidates" | "all_blocked" | "below_threshold";
      ranked: KairaActivityProposalScore[];
    };

const finiteUnit = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;
const finiteAffinity = (value: number) => Number.isFinite(value) && value >= -1 && value <= 1;
const canonicalKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

function normalizeCandidate(candidate: KairaActivityProposalCandidate): KairaActivityProposalCandidate {
  const proposalId = canonicalKey(candidate.proposalId);
  const activityType = canonicalKey(candidate.activityType);
  const notBeforeMs = Date.parse(candidate.notBefore);
  const expiresAtMs = candidate.expiresAt ? Date.parse(candidate.expiresAt) : undefined;
  if (
    !proposalId ||
    !activityType ||
    !finiteUnit(candidate.motivation.strength) ||
    !finiteAffinity(candidate.learnedPreference.affinity) ||
    !finiteUnit(candidate.learnedPreference.confidence) ||
    !finiteUnit(candidate.noveltyFit) ||
    !finiteUnit(candidate.contextualFit) ||
    !finiteUnit(candidate.interruptionCost) ||
    !finiteUnit(candidate.risk) ||
    !finiteUnit(candidate.repetitionPressure) ||
    !Number.isFinite(notBeforeMs) ||
    (expiresAtMs !== undefined && (!Number.isFinite(expiresAtMs) || expiresAtMs <= notBeforeMs))
  ) {
    throw new Error("Invalid Kaira activity proposal candidate");
  }
  return {
    ...candidate,
    proposalId,
    activityType,
    notBefore: new Date(notBeforeMs).toISOString(),
    ...(expiresAtMs !== undefined ? { expiresAt: new Date(expiresAtMs).toISOString() } : {}),
    evidenceIds: Array.from(new Set(candidate.evidenceIds.map((id) => String(id || "").trim()).filter(Boolean))).slice(0, 24),
    ...(candidate.experienceSubject
      ? { experienceSubject: { ...candidate.experienceSubject } }
      : {}),
  };
}

function validatePolicy(policy: KairaActivityPlanningPolicy) {
  if (!finiteUnit(policy.minimumScore)) throw new Error("Invalid Kaira activity planning threshold");
  const values = Object.values(policy.weights);
  if (values.some((value) => !finiteUnit(value))) throw new Error("Invalid Kaira activity planning weights");
}

export function scoreKairaActivityProposal(
  candidateInput: KairaActivityProposalCandidate,
  policy: KairaActivityPlanningPolicy = DEFAULT_KAIRA_ACTIVITY_PLANNING_POLICY,
): KairaActivityProposalScore {
  validatePolicy(policy);
  const candidate = normalizeCandidate(candidateInput);
  const preferenceSignal = candidate.learnedPreference.affinity * candidate.learnedPreference.confidence;
  const components = {
    motivation: candidate.motivation.strength * policy.weights.motivation,
    preference: preferenceSignal * policy.weights.preference,
    novelty: candidate.noveltyFit * policy.weights.novelty,
    context: candidate.contextualFit * policy.weights.context,
    interruptionCost: -candidate.interruptionCost * policy.weights.interruptionCost,
    risk: -candidate.risk * policy.weights.risk,
    repetition: -candidate.repetitionPressure * policy.weights.repetition,
  };
  const score = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { proposalId: candidate.proposalId, score, candidate, components };
}

/**
 * Generic comparative policy for Kaira-owned activity proposals.
 * It contains no activity-name rules and does not execute, schedule or ask permission.
 */
export function planKairaActivityProposal(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  candidates: KairaActivityProposalCandidate[];
  policy?: KairaActivityPlanningPolicy;
}): KairaActivityPlanningDecision {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  const instanceRules = instancePolicy(instance.instanceType);
  if (!instanceRules.autonomousActivityPlanning) {
    return { status: "none", reason: "all_blocked", ranked: [] };
  }
  if (!input.candidates.length) return { status: "none", reason: "no_candidates", ranked: [] };

  const available = input.candidates.filter((candidate) => candidate.availability === "available");
  if (!available.length) return { status: "none", reason: "all_blocked", ranked: [] };

  const policy = input.policy || DEFAULT_KAIRA_ACTIVITY_PLANNING_POLICY;
  const ranked = available
    .map((candidate, inputOrder) => ({ inputOrder, scored: scoreKairaActivityProposal(candidate, policy) }))
    .sort((left, right) => right.scored.score - left.scored.score || left.inputOrder - right.inputOrder)
    .map(({ scored }) => scored);
  const selected = ranked[0];
  if (!selected || selected.score < policy.minimumScore) {
    return { status: "none", reason: "below_threshold", ranked };
  }
  return { status: "selected", selected, ranked };
}
