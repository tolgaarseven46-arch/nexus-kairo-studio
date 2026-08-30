import type { WorldEventObservation } from "./worldModelEventStore";
import type { ModalCanonicalWorldEvent } from "./worldEventModality";
import { compareObservationRecency } from "./temporalEvidencePolicy";

export type WorldEventLifecycleSignalKind =
  | "executed"
  | "cancelled"
  | "postponed"
  | "failed"
  | "unspecified";

export interface WorldEventLifecycleSignal {
  kind: WorldEventLifecycleSignalKind;
  strength: number;
  marker?: string;
}

export type LifecycleCanonicalWorldEvent = ModalCanonicalWorldEvent & {
  lifecycle?: WorldEventLifecycleSignal;
};

export type PlanLifecycleState =
  | "planned"
  | "executed"
  | "cancelled"
  | "postponed"
  | "failed"
  | "unknown";

export interface PlanLifecycleResolution {
  propositionKey?: string;
  state: PlanLifecycleState;
  latestObservationId?: string;
  planObservationId?: string;
  generationObservationId?: string;
  evidenceObservationIds: string[];
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const RULES: Array<{
  kind: Exclude<WorldEventLifecycleSignalKind, "unspecified">;
  strength: number;
  pattern: RegExp;
}> = [
  {
    kind: "cancelled",
    strength: 0.96,
    pattern: /(?:vazgeç(?:tim|ti|tik|tiler)|iptal\s+et(?:tim|ti|tik|tiler)|artık\s+yapmayacağ|yapmaktan\s+vazgeç)/iu,
  },
  {
    kind: "postponed",
    strength: 0.9,
    pattern: /(?:ertele(?:dim|di|dik|diler)|başka\s+güne\s+bırak(?:tım|tı)|sonraya\s+bırak(?:tım|tı))/iu,
  },
  {
    kind: "failed",
    strength: 0.9,
    pattern: /(?:yapamad(?:ım|ı|ık|ılar)|başaramad(?:ım|ı|ık|ılar)|olmadı|gerçekleşmedi)/iu,
  },
  {
    kind: "executed",
    strength: 0.88,
    pattern: /(?:istifa\s+et(?:tim|ti|tik|tiler)|işten\s+ayrıl(?:dım|dı|dık|dılar)|müdür(?:le|la)\s+görüş(?:tüm|tü|tük|tüler)|patron(?:la|le)\s+görüş(?:tüm|tü|tük|tüler)|işe\s+(?:git|gid)(?:tim|ti|tik|tiler))/iu,
  },
];

export function detectWorldEventLifecycleSignal(message: string): WorldEventLifecycleSignal {
  const text = normalize(message);
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) return { kind: rule.kind, strength: rule.strength, marker: match[0] };
  }
  return { kind: "unspecified", strength: 0 };
}

export function enrichWorldEventLifecycle(
  event: ModalCanonicalWorldEvent,
): LifecycleCanonicalWorldEvent {
  return {
    ...event,
    lifecycle: detectWorldEventLifecycleSignal(event.raw),
  };
}

function isPlanEvidence(event: LifecycleCanonicalWorldEvent): boolean {
  if (event.polarity === "negative" || event.modality?.kind === "refusal") return false;
  return ["commitment", "plan", "intention"].includes(event.modality?.kind || "");
}

/**
 * Derives the current lifecycle for the newest immutable plan generation of one
 * canonical proposition. A newer plan/commitment/intention starts a fresh
 * generation. Lifecycle outcomes that occurred before that generation cannot
 * close or contaminate the new plan.
 */
export function resolvePlanLifecycle(
  observations: WorldEventObservation[],
  propositionKey: string,
): PlanLifecycleResolution {
  const matching = observations
    .filter((item) => item.event.proposition?.key === propositionKey)
    .sort(compareObservationRecency);

  if (!matching.length) {
    return { propositionKey, state: "unknown", evidenceObservationIds: [] };
  }

  const plan = matching.find((item) => isPlanEvidence(item.event));
  if (!plan) {
    return {
      propositionKey,
      state: "unknown",
      latestObservationId: matching[0].id,
      evidenceObservationIds: matching.map((item) => item.id).filter((id): id is string => Boolean(id)),
    };
  }

  const planIndex = matching.indexOf(plan);
  // matching is newest -> oldest. Only rows newer than the newest plan belong
  // to the current generation's outcome window; the plan itself is included as
  // the generation anchor.
  const generation = matching.slice(0, planIndex + 1);
  const latestSignal = generation.find((item) => {
    const kind = item.event.lifecycle?.kind;
    return Boolean(kind && kind !== "unspecified");
  });

  const signalState = latestSignal?.event.lifecycle?.kind;
  const state: PlanLifecycleState = signalState && signalState !== "unspecified"
    ? signalState
    : "planned";

  return {
    propositionKey,
    state,
    latestObservationId: generation[0]?.id,
    planObservationId: plan.id,
    generationObservationId: plan.id,
    evidenceObservationIds: generation
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id)),
  };
}
