import type {
  KairaActivityExecutionExperienceSubject,
  KairaActivityPermissionPolicy,
} from "./kairaActivityExecution";
import type {
  KairaActivityMotivationKind,
  KairaActivityProposalCandidate,
} from "./kairaActivityPlanningPolicy";
import type { KairaActivityMotivationProfile } from "./kairaActivityMotivation";

export interface KairaLearnedActivityPreferenceSignal {
  key: string;
  affinity: number;
  confidence: number;
  evidenceId?: string;
}

export interface KairaRecentActivitySignal {
  repetitionKey: string;
  recency: number;
  completionWeight?: number;
  evidenceId?: string;
}

export interface KairaActivityDescriptor {
  proposalId: string;
  activityType: string;
  motivationAffinity: Partial<Record<KairaActivityMotivationKind, number>>;
  preferenceKeys?: string[];
  repetitionKey?: string;
  noveltyPotential?: number;
  contextualFit?: number;
  interruptionCost?: number;
  risk?: number;
  availability?: "available" | "blocked";
  permissionPolicy?: KairaActivityPermissionPolicy;
  experienceSubject?: KairaActivityExecutionExperienceSubject;
  notBefore: string;
  expiresAt?: string;
  evidenceIds?: string[];
}

export interface KairaActivityCandidateGenerationInput {
  descriptors: KairaActivityDescriptor[];
  motivation: KairaActivityMotivationProfile;
  learnedPreferences?: KairaLearnedActivityPreferenceSignal[];
  recentActivities?: KairaRecentActivitySignal[];
}

const unit = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
};
const affinity = (value: unknown, fallback = 0) => {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(-1, Math.min(1, numeric));
};
const key = (value: unknown) => String(value || "").trim();

function motivationForDescriptor(
  profile: KairaActivityMotivationProfile,
  descriptor: KairaActivityDescriptor,
): { kind: KairaActivityMotivationKind; strength: number } {
  const kinds = Object.keys(profile) as KairaActivityMotivationKind[];
  let selectedKind: KairaActivityMotivationKind = "self_goal";
  let selectedContribution = 0;
  let weighted = 0;
  let totalAffinity = 0;
  for (const kind of kinds) {
    const descriptorAffinity = unit(descriptor.motivationAffinity?.[kind], 0);
    const contribution = unit(profile[kind], 0) * descriptorAffinity;
    weighted += contribution;
    totalAffinity += descriptorAffinity;
    if (contribution > selectedContribution) {
      selectedContribution = contribution;
      selectedKind = kind;
    }
  }
  return {
    kind: selectedKind,
    strength: totalAffinity > 0 ? unit(weighted / totalAffinity, 0) : 0,
  };
}

function preferenceForDescriptor(
  descriptor: KairaActivityDescriptor,
  learnedPreferences: KairaLearnedActivityPreferenceSignal[],
) {
  const acceptedKeys = new Set((descriptor.preferenceKeys || []).map(key).filter(Boolean));
  const matching = learnedPreferences.filter((signal) => acceptedKeys.has(key(signal.key)));
  if (!matching.length) return { affinity: 0, confidence: 0, evidenceIds: [] as string[] };

  let weightedAffinity = 0;
  let confidenceWeight = 0;
  const evidenceIds: string[] = [];
  for (const signal of matching) {
    const confidence = unit(signal.confidence, 0);
    weightedAffinity += affinity(signal.affinity) * confidence;
    confidenceWeight += confidence;
    if (key(signal.evidenceId)) evidenceIds.push(key(signal.evidenceId));
  }
  return {
    affinity: confidenceWeight > 0 ? affinity(weightedAffinity / confidenceWeight) : 0,
    confidence: unit(confidenceWeight / matching.length, 0),
    evidenceIds,
  };
}

function repetitionForDescriptor(
  descriptor: KairaActivityDescriptor,
  recentActivities: KairaRecentActivitySignal[],
) {
  const repetitionKey = key(descriptor.repetitionKey);
  if (!repetitionKey) return { pressure: 0, evidenceIds: [] as string[] };
  const matching = recentActivities.filter((signal) => key(signal.repetitionKey) === repetitionKey);
  if (!matching.length) return { pressure: 0, evidenceIds: [] as string[] };
  let remaining = 1;
  const evidenceIds: string[] = [];
  for (const signal of matching) {
    const contribution = unit(signal.recency, 0) * unit(signal.completionWeight, 1);
    remaining *= 1 - contribution;
    if (key(signal.evidenceId)) evidenceIds.push(key(signal.evidenceId));
  }
  return { pressure: unit(1 - remaining, 0), evidenceIds };
}

/**
 * Converts an external, descriptor-driven activity catalog into the exact
 * generic evidence shape consumed by the proposal planning policy. No activity
 * identity is interpreted here and this function performs no I/O or mutation.
 */
export function generateKairaActivityCandidates(
  input: KairaActivityCandidateGenerationInput,
): KairaActivityProposalCandidate[] {
  const learnedPreferences = Array.isArray(input.learnedPreferences) ? input.learnedPreferences : [];
  const recentActivities = Array.isArray(input.recentActivities) ? input.recentActivities : [];

  return input.descriptors.map((descriptor) => {
    const motivation = motivationForDescriptor(input.motivation, descriptor);
    const learnedPreference = preferenceForDescriptor(descriptor, learnedPreferences);
    const repetition = repetitionForDescriptor(descriptor, recentActivities);
    const evidenceIds = Array.from(new Set([
      ...(descriptor.evidenceIds || []).map(key),
      ...learnedPreference.evidenceIds,
      ...repetition.evidenceIds,
    ].filter(Boolean)));

    return {
      proposalId: key(descriptor.proposalId),
      activityType: key(descriptor.activityType),
      motivation,
      learnedPreference: {
        affinity: learnedPreference.affinity,
        confidence: learnedPreference.confidence,
      },
      noveltyFit: unit(descriptor.noveltyPotential, 0.5) * (1 - repetition.pressure),
      contextualFit: unit(descriptor.contextualFit, 0.5),
      interruptionCost: unit(descriptor.interruptionCost, 0.5),
      risk: unit(descriptor.risk, 1),
      repetitionPressure: repetition.pressure,
      availability: descriptor.availability === "available" ? "available" : "blocked",
      permissionPolicy: descriptor.permissionPolicy || "owner_approval",
      notBefore: descriptor.notBefore,
      ...(descriptor.expiresAt ? { expiresAt: descriptor.expiresAt } : {}),
      ...(descriptor.experienceSubject ? { experienceSubject: { ...descriptor.experienceSubject } } : {}),
      evidenceIds,
    };
  });
}
