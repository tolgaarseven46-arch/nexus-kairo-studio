import type { WorldEventObservation } from "./worldModelEventStore";
import type { WorldEventPolarity } from "./worldEventEngine";
import { orderObservationsByRecency } from "./temporalEvidencePolicy";

const normalize = (value?: string) =>
  String(value || "").toLocaleLowerCase("tr-TR").trim();

function legacyPropositionKey(observation: WorldEventObservation): string {
  const event = observation.event;
  const actor = normalize(event.actor?.id || event.actor?.name) || "?";
  const target = normalize(event.target?.id || event.target?.name) || "?";
  return `${actor}|${event.eventType}|${target}`;
}

export function observationPropositionKey(observation: WorldEventObservation): string {
  return observation.event.proposition?.key || legacyPropositionKey(observation);
}

export function observationPolarity(observation: WorldEventObservation): WorldEventPolarity {
  return observation.event.polarity || "unknown";
}

export interface ContradictionEvidenceSet {
  propositionKey: string;
  status: "consistent" | "conflicting" | "unknown";
  observations: WorldEventObservation[];
  latest?: WorldEventObservation;
  polarities: WorldEventPolarity[];
}

/**
 * Contradiction resolution is evidence policy, not truth synthesis.
 * Same proposition + opposite explicit polarities becomes `conflicting`.
 * Every source observation survives and the newest row is exposed only as the
 * current evidence, never as an automatically verified fact.
 */
export function resolveContradictionEvidence(
  observations: WorldEventObservation[],
): ContradictionEvidenceSet[] {
  const groups = new Map<string, WorldEventObservation[]>();

  for (const observation of observations) {
    const key = observationPropositionKey(observation);
    const items = groups.get(key) || [];
    items.push(observation);
    groups.set(key, items);
  }

  return [...groups.entries()].map(([propositionKey, items]) => {
    const ordered = orderObservationsByRecency(items);
    const polarities = [...new Set(ordered.map(observationPolarity))];
    const explicit = new Set(polarities.filter((value) => value !== "unknown"));
    const status: ContradictionEvidenceSet["status"] =
      explicit.has("positive") && explicit.has("negative")
        ? "conflicting"
        : explicit.size === 0
          ? "unknown"
          : "consistent";

    return {
      propositionKey,
      status,
      observations: ordered,
      latest: ordered[0],
      polarities,
    };
  });
}

export function contradictionSetForObservation(
  focus: WorldEventObservation,
  observations: WorldEventObservation[],
): ContradictionEvidenceSet | undefined {
  const key = observationPropositionKey(focus);
  return resolveContradictionEvidence(observations).find((set) => set.propositionKey === key);
}

export interface ContradictionContractIssue {
  invariant: string;
  message: string;
}

export function validateContradictionEvidenceContract(
  observations: WorldEventObservation[],
): ContradictionContractIssue[] {
  const issues: ContradictionContractIssue[] = [];

  for (const set of resolveContradictionEvidence(observations)) {
    const sourceIds = new Set(set.observations.map((item) => item.id || `${item.sessionId}:${item.createdAt}:${item.event.raw}`));
    if (sourceIds.size !== set.observations.length) {
      issues.push({
        invariant: "contradiction.preserve_source_observations",
        message: `Contradiction set duplicate/collapsed source evidence: ${set.propositionKey}`,
      });
    }
    if (set.status === "conflicting" && !set.latest) {
      issues.push({
        invariant: "contradiction.latest_evidence_available",
        message: `Conflicting set has no latest evidence: ${set.propositionKey}`,
      });
    }
  }

  return issues;
}
