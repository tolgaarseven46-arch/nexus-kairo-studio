import type { WorldEventObservation } from "./worldModelEventStore";

const normalize = (value?: string) =>
  String(value || "").toLocaleLowerCase("tr-TR").trim();

const timestamp = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Sort comparator for authoritative temporal ordering.
 * Newest valid timestamps come first. Invalid timestamps are kept behind valid
 * evidence so they can never silently win an "en son" decision.
 */
export function compareObservationRecency(
  a: WorldEventObservation,
  b: WorldEventObservation,
): number {
  const at = timestamp(a.createdAt);
  const bt = timestamp(b.createdAt);
  if (at === null && bt === null) return 0;
  if (at === null) return 1;
  if (bt === null) return -1;
  return bt - at;
}

export function orderObservationsByRecency(
  observations: WorldEventObservation[],
): WorldEventObservation[] {
  return [...observations].sort(compareObservationRecency);
}

export function latestObservationForActor(
  observations: WorldEventObservation[],
  actorName: string,
): WorldEventObservation | undefined {
  const actor = normalize(actorName);
  return orderObservationsByRecency(
    observations.filter(
      (item) => normalize(item.event.actor?.name || item.event.actor?.id) === actor,
    ),
  )[0];
}

export interface TemporalEvidenceVariationGroup {
  actor: string;
  target: string;
  observations: WorldEventObservation[];
  distinctRawClaims: string[];
}

/**
 * Groups time-varying evidence without pretending that textual difference is a
 * formal logical contradiction. Until the canonical schema gains proposition
 * identity/polarity, the safe policy is preservation rather than synthesis.
 */
export function groupTemporalEvidenceVariations(
  observations: WorldEventObservation[],
): TemporalEvidenceVariationGroup[] {
  const groups = new Map<string, WorldEventObservation[]>();

  for (const item of observations) {
    const actor = normalize(item.event.actor?.name || item.event.actor?.id);
    const target = normalize(item.event.target?.name || item.event.target?.id);
    if (!actor) continue;
    const key = `${actor}|${target}`;
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  const result: TemporalEvidenceVariationGroup[] = [];
  for (const [key, items] of groups) {
    const raws = [...new Set(items.map((item) => item.event.raw).filter(Boolean))];
    if (raws.length < 2) continue;
    const [actor, target] = key.split("|");
    result.push({
      actor: actor || "",
      target: target || "",
      observations: orderObservationsByRecency(items),
      distinctRawClaims: raws,
    });
  }
  return result;
}

export interface TemporalEvidenceContractIssue {
  invariant: string;
  message: string;
}

export function validateTemporalEvidenceContract(
  observations: WorldEventObservation[],
): TemporalEvidenceContractIssue[] {
  const issues: TemporalEvidenceContractIssue[] = [];

  for (const item of observations) {
    if (timestamp(item.createdAt) === null) {
      issues.push({
        invariant: "temporal.valid_timestamp",
        message: `Geçersiz createdAt: ${item.createdAt}`,
      });
    }
  }

  for (const group of groupTemporalEvidenceVariations(observations)) {
    if (group.observations.length !== new Set(group.observations).size) {
      issues.push({
        invariant: "temporal.preserve_distinct_evidence",
        message: `Temporal evidence grubu observation kaybetti: ${group.actor}`,
      });
    }
  }

  return issues;
}
