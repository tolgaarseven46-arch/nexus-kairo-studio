import type { WorldEventObservation } from "./worldModelEventStore";
import { resolvePlanLifecycle, type PlanLifecycleResolution } from "./worldEventLifecycle";

export interface PlanOutcomeRecallResult {
  matched: boolean;
  resolution?: PlanLifecycleResolution;
  propositionKey?: string;
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const OUTCOME_QUERY_RE = /(?:^|[^\p{L}\p{N}_])(?:yaptı\s+mı|etti\s+mi|gerçekleşti\s+mi|vazgeçti\s+mi|erteledi\s+mi|ne\s+oldu)(?:[^\p{L}\p{N}_]|$)/iu;

export function isPlanOutcomeRecallQuery(message: string): boolean {
  return OUTCOME_QUERY_RE.test(normalize(message));
}

/**
 * Resolves outcome recall only when the query can be narrowed to exactly one
 * canonical proposition from loaded evidence. Multiple matching propositions
 * remain unresolved instead of being broken by recency.
 */
export function resolvePlanOutcomeRecall(input: {
  message: string;
  observations: WorldEventObservation[];
}): PlanOutcomeRecallResult {
  if (!isPlanOutcomeRecallQuery(input.message)) return { matched: false };

  const text = normalize(input.message);
  const candidates = input.observations.filter((item) => {
    const actor = normalize(item.event.actor?.name || "");
    const content = normalize(item.event.proposition?.contentKey || "");
    const actorMatches = !actor || text.includes(actor);
    const contentMatches = !content || text.includes(content) ||
      (content === "resign" && text.includes("istifa")) ||
      (content === "manager_meeting" && /müdür|patron/.test(text)) ||
      (content === "go_to_work" && text.includes("işe"));
    return actorMatches && contentMatches && Boolean(item.event.proposition?.key);
  });

  const propositionKeys = [...new Set(
    candidates.map((item) => item.event.proposition?.key).filter((key): key is string => Boolean(key)),
  )];
  if (propositionKeys.length !== 1) return { matched: true };

  const propositionKey = propositionKeys[0];
  return {
    matched: true,
    propositionKey,
    resolution: resolvePlanLifecycle(input.observations, propositionKey),
  };
}
