import type { SocialAppraisalCommitmentContext } from "../types/socialAppraisal";
import { resolvePlanLifecycle } from "./worldEventLifecycle";
import type { WorldEventObservation } from "./worldModelEventStore";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function lifecycleState(
  state: ReturnType<typeof resolvePlanLifecycle>["state"],
): SocialAppraisalCommitmentContext["state"] {
  switch (state) {
    case "planned": return "active";
    case "executed": return "fulfilled";
    case "cancelled": return "cancelled";
    case "failed": return "failed";
    default: return "unknown";
  }
}

/**
 * Project canonical persisted world-event truth into the narrow appraisal memory
 * contract. This function never parses raw text and never creates a new durable
 * memory source; `worldModel` + `resolvePlanLifecycle` remain authoritative.
 */
export function buildSocialAppraisalCommitmentContext(
  observations: readonly WorldEventObservation[],
): SocialAppraisalCommitmentContext[] {
  const propositionKeys = Array.from(new Set(
    observations
      .filter((item) => item.event.modality?.kind === "commitment")
      .map((item) => item.event.proposition?.key)
      .filter((key): key is string => Boolean(key)),
  ));

  return propositionKeys.flatMap((scopeKey) => {
    const lifecycle = resolvePlanLifecycle([...observations], scopeKey);
    const generation = observations.find((item) => item.id === lifecycle.generationObservationId);
    if (!generation || generation.event.modality?.kind !== "commitment") return [];

    const actorId = generation.event.proposition?.actorKey;
    if (!actorId) return [];
    const confidence = clamp01(Math.min(
      generation.event.certainty,
      generation.event.modality?.strength ?? 0,
    ));
    const provenance = [
      ...(generation.id ? [`world_event:${generation.id}`] : []),
      ...lifecycle.evidenceObservationIds.map((id) => `world_event:${id}`),
    ].filter((value, index, all) => all.indexOf(value) === index);

    return [{
      kind: "commitment" as const,
      state: lifecycleState(lifecycle.state),
      actorId,
      ...(generation.event.proposition?.targetKey
        ? { counterpartyId: generation.event.proposition.targetKey }
        : {}),
      scopeKey,
      confidence,
      provenance,
    }];
  });
}
