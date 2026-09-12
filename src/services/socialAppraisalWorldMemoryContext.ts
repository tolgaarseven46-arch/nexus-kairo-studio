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

interface CommitmentIdentity {
  scopeKey: string;
  actorId: string;
  counterpartyId?: string;
}

function sameCommitmentIdentity(
  item: Readonly<WorldEventObservation>,
  identity: Readonly<CommitmentIdentity>,
): boolean {
  const proposition = item.event.proposition;
  if (!proposition) return false;
  return proposition.key === identity.scopeKey
    && proposition.actorKey === identity.actorId
    && proposition.targetKey === identity.counterpartyId;
}

/**
 * Project canonical persisted world-event truth into the narrow appraisal memory
 * contract. This function never parses raw text and never creates a new durable
 * memory source; `worldModel` + `resolvePlanLifecycle` remain authoritative.
 */
export function buildSocialAppraisalCommitmentContext(
  observations: readonly WorldEventObservation[],
): SocialAppraisalCommitmentContext[] {
  const identities = Array.from(
    observations
      .filter((item) => item.event.modality?.kind === "commitment")
      .reduce((byIdentity, item) => {
        const scopeKey = item.event.proposition?.key;
        const actorId = item.event.proposition?.actorKey;
        if (!scopeKey || !actorId) return byIdentity;

        const counterpartyId = item.event.proposition?.targetKey;
        const identityKey = JSON.stringify([scopeKey, actorId, counterpartyId ?? null]);
        if (!byIdentity.has(identityKey)) {
          byIdentity.set(identityKey, {
            scopeKey,
            actorId,
            ...(counterpartyId ? { counterpartyId } : {}),
          });
        }
        return byIdentity;
      }, new Map<string, CommitmentIdentity>())
      .values(),
  );

  return identities.flatMap((identity) => {
    const identityObservations = observations.filter((item) => sameCommitmentIdentity(item, identity));
    const lifecycle = resolvePlanLifecycle([...identityObservations], identity.scopeKey);
    const generation = identityObservations.find((item) => item.id === lifecycle.generationObservationId);
    if (!generation || generation.event.modality?.kind !== "commitment") return [];

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
      actorId: identity.actorId,
      ...(identity.counterpartyId ? { counterpartyId: identity.counterpartyId } : {}),
      scopeKey: identity.scopeKey,
      confidence,
      provenance,
    }];
  });
}
