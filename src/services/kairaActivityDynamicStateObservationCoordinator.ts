import type { DroitDynamicState } from "../types/nexus";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import {
  kairaActivityDynamicStateMagnitude,
  saveKairaActivityDynamicStateAtomic,
  type KairaActivityDynamicStateSnapshot,
} from "./kairaActivityDynamicStateStore";
import { enqueueKairaActivityPlanningTriggerAtomic } from "./kairaActivityPlanningTriggerInboxStore";

export { kairaActivityDynamicStateMagnitude };

function dynamicStateTriggerId(snapshot: KairaActivityDynamicStateSnapshot): string {
  return `dynamic_state:${snapshot.sourceId}`;
}

/**
 * Persists Kaira-wide affect first, then durably emits a planning observation.
 * The persisted magnitude makes the delivery retry-safe if a process dies between
 * the state write and inbox enqueue. Materiality remains trigger-policy owned.
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
  if (saved.status === "stale" || saved.snapshot.changeMagnitude === undefined) {
    return { state: saved, planningTriggerInbox: null };
  }
  const planningTriggerInbox = await enqueueKairaActivityPlanningTriggerAtomic({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: saved.snapshot.kairaInstanceId,
    instanceType: saved.snapshot.instanceType,
    trigger: {
      triggerId: dynamicStateTriggerId(saved.snapshot),
      kind: "dynamic_state_change",
      sourceId: saved.snapshot.sourceId,
      occurredAt: saved.snapshot.observedAt,
      magnitude: saved.snapshot.changeMagnitude,
    },
    now: saved.snapshot.observedAt,
  });
  return { state: saved, planningTriggerInbox };
}
