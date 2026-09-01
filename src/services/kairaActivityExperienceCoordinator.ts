import {
  saveKairaActivityWorldObservation,
  type KairaActivityExperienceSubject,
  type WorldEventObservation,
} from "./worldModelEventStore";
import {
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import type {
  KairaActivityExecutionReceipt,
  KairaActivityOutcomeAppraisal,
} from "./kairaActivityExperienceReceipt";
import {
  consolidatePersistedWorldObservation,
  type KairaPersistedObservationConsolidationResult,
} from "./kairaPersistedObservationConsolidation";

export interface KairaCompletedActivityExperienceInput {
  authority: "kaira_activity_executor";
  userId?: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  sessionId: string;
  activityId: string;
  activityType: string;
  experienceSubject?: KairaActivityExperienceSubject;
  outcome: KairaActivityOutcomeAppraisal;
}

export interface KairaCompletedActivityExperienceResult {
  observation: WorldEventObservation;
  receipt: KairaActivityExecutionReceipt;
  consolidation: KairaPersistedObservationConsolidationResult;
}

/**
 * Trusted use-case seam for completed Kaira-owned experiences.
 *
 * Ordering is deliberate and non-negotiable:
 * 1. persist canonical activity world truth exactly once,
 * 2. use the returned real observation id to construct the executor receipt,
 * 3. consolidate already-persisted truth into autobiography/self revision.
 *
 * Callers never supply `sourceWorldObservationId`, so provenance cannot be
 * guessed before world persistence.
 */
export async function recordCompletedKairaActivityExperience(
  input: KairaCompletedActivityExperienceInput,
): Promise<KairaCompletedActivityExperienceResult> {
  if (input.authority !== "kaira_activity_executor") {
    throw new Error("Trusted Kaira activity executor authority required");
  }
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });

  const observation = await saveKairaActivityWorldObservation({
    userId: input.userId,
    kairaInstanceId: instance.instanceId,
    sessionId: input.sessionId,
    activity: {
      activityId: input.activityId,
      activityType: input.activityType,
      status: "completed",
      ...(input.experienceSubject ? { experienceSubject: input.experienceSubject } : {}),
    },
  });
  if (!observation.id || observation.kind !== "kaira_activity" || !observation.activity) {
    throw new Error("Canonical Kaira activity observation required");
  }

  const canonicalSubject = observation.activity.experienceSubject;
  const receipt: KairaActivityExecutionReceipt = {
    authority: "kaira_activity_executor",
    activityId: observation.activity.activityId,
    kairaInstanceId: instance.instanceId,
    sourceWorldObservationId: observation.id,
    status: "completed",
    ...(canonicalSubject
      ? {
          preferenceProbe: {
            preferenceKey: canonicalSubject.preferenceKey,
            experiencedValue: canonicalSubject.experiencedValue,
          },
        }
      : {}),
    outcome: { ...input.outcome },
  };

  const consolidation = await consolidatePersistedWorldObservation({
    instance,
    observation,
    activityExperienceReceipt: receipt,
  });

  return { observation, receipt, consolidation };
}
