import type { DroitDynamicState } from "../types/nexus";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import {
  saveKairaActivityDynamicStateAtomic,
  type KairaActivityDynamicStateSnapshot,
} from "./kairaActivityDynamicStateStore";
import { enqueueKairaActivityPlanningTriggerAtomic } from "./kairaActivityPlanningTriggerInboxStore";

const AXES: Array<keyof Pick<DroitDynamicState, "calmness" | "anger" | "stress" | "happiness" | "confidence" | "surprise">> = [
  "calmness",
  "anger",
  "stress",
  "happiness",
  "confidence",
  "surprise",
];

export function kairaActivityDynamicStateMagnitude(
  previous: DroitDynamicState,
  current: DroitDynamicState,
): number {
  return Math.max(...AXES.map((axis) => Math.abs(current[axis] - previous[axis]) / 100));
}

function dynamicStateTriggerId(snapshot: KairaActivityDynamicStateSnapshot): string {
  return `dynamic_state:${snapshot.sourceId}`;
}

/**
 * Persists Kaira-wide affect first, then durably emits a planning observation.
 * Materiality remains owned by kairaActivityPlanningTrigger policy.
 */
export async function observeKairaActivityDynamicState(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  state: DroitDynamicState;
  observedAt: string;
  sourceId: string;
}) {
  const saved = await saveKairaActivityDynamicStateAtomic({
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    state: input.state,
    observedAt: input.observedAt,
    sourceId: input.sourceId,
  });
  if (saved.status !== "saved" || !saved.previous) {
    return { state: saved, planningTriggerInbox: null };
  }
  const magnitude = kairaActivityDynamicStateMagnitude(saved.previous.state, saved.snapshot.state);
  const planningTriggerInbox = await enqueueKairaActivityPlanningTriggerAtomic({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: saved.snapshot.kairaInstanceId,
    instanceType: saved.snapshot.instanceType,
    trigger: {
      triggerId: dynamicStateTriggerId(saved.snapshot),
      kind: "dynamic_state_change",
      sourceId: saved.snapshot.sourceId,
      occurredAt: saved.snapshot.observedAt,
      magnitude,
    },
    now: input.observedAt,
  });
  return { state: saved, planningTriggerInbox };
}
