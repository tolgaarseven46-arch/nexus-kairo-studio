import type { RetrievedWorldEvent } from "./worldEventRetrieval";
import type { WorldEventObservation } from "./worldModelEventStore";
import { modalityExecutionWeight } from "./worldEventModality";
import { compareObservationRecency } from "./temporalEvidencePolicy";

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const PLAN_RECALL_RE = /(?:ne yapacaktı|ne yapmayı düşünüyordu|planı neydi|ne planlıyordu)/iu;

export function isPlanRecallQuery(message: string): boolean {
  return PLAN_RECALL_RE.test(normalize(message));
}

function queryNames(message: string, observations: WorldEventObservation[]): string[] {
  const text = normalize(message);
  const known = new Set<string>();
  for (const item of observations) {
    for (const value of [item.event.actor?.name, item.event.target?.name, item.speakerName]) {
      if (!value) continue;
      const name = normalize(value);
      if (name && text.includes(name)) known.add(name);
    }
  }
  return [...known];
}

/**
 * Plan recall is a dedicated evidence policy. It never promotes weak modality
 * to commitment and never treats refusal/negative polarity as planned execution.
 */
export function rankPlanRecallObservations(input: {
  message: string;
  observations: WorldEventObservation[];
  maxItems?: number;
}): RetrievedWorldEvent[] {
  if (!isPlanRecallQuery(input.message)) return [];

  const names = queryNames(input.message, input.observations);
  const maxItems = Math.max(1, Math.min(input.maxItems ?? 5, 10));
  const ranked = input.observations
    .filter((item) => {
      if (!names.length) return true;
      const actor = normalize(item.event.actor?.name || "");
      const target = normalize(item.event.target?.name || "");
      return names.includes(actor) || names.includes(target);
    })
    .map((observation): RetrievedWorldEvent => {
      const weight = modalityExecutionWeight(observation.event);
      const reasons = [
        `modality:${observation.event.modality?.kind || "legacy_unspecified"}`,
      ];
      if (weight < 0) reasons.push("not_planned_execution");
      if (observation.event.proposition?.contentKey) {
        reasons.push(`content:${observation.event.proposition.contentKey}`);
      }
      return {
        observation,
        score: Math.max(-2, weight) + Math.max(0, Math.min(1, observation.event.certainty ?? 0)),
        reasons,
      };
    })
    .filter((item) => item.score > 0 && !item.reasons.includes("not_planned_execution"))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return compareObservationRecency(a.observation, b.observation);
    });

  return ranked.slice(0, maxItems);
}
