import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { DroitDynamicState } from "../types/nexus";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";

const COLLECTION = "kairaActivityDynamicState";

export interface KairaActivityDynamicStateSnapshot {
  schemaVersion: 1;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  state: DroitDynamicState;
  observedAt: string;
  sourceId: string;
}

const sourceKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_@.+:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 160);

const boundedPercent = (value: unknown, label: string) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid Kaira activity dynamic state ${label}`);
  }
  return value;
};

function canonicalTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid Kaira activity dynamic state time");
  return new Date(parsed).toISOString();
}

/**
 * Projects only Kaira-wide affect axes. Dyadic relationship/reaction metadata is
 * intentionally excluded from autonomous-life state ownership.
 */
export function projectKairaActivityDynamicState(state: DroitDynamicState): DroitDynamicState {
  return {
    calmness: boundedPercent(state.calmness, "calmness"),
    anger: boundedPercent(state.anger, "anger"),
    stress: boundedPercent(state.stress, "stress"),
    happiness: boundedPercent(state.happiness, "happiness"),
    confidence: boundedPercent(state.confidence, "confidence"),
    surprise: boundedPercent(state.surprise, "surprise"),
    lastStatus: String(state.lastStatus || "").trim().slice(0, 240) || "state_observed",
  };
}

function normalizeSnapshot(value: unknown): KairaActivityDynamicStateSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid persisted Kaira activity dynamic state");
  const snapshot = value as Partial<KairaActivityDynamicStateSnapshot>;
  if (
    snapshot.schemaVersion !== 1 ||
    !snapshot.state ||
    !snapshot.kairaInstanceId ||
    (snapshot.instanceType !== "reference" && snapshot.instanceType !== "individual" && snapshot.instanceType !== "welcome")
  ) {
    throw new Error("Invalid persisted Kaira activity dynamic state");
  }
  const instance = resolveKairaInstanceContext({
    instanceId: snapshot.kairaInstanceId,
    instanceType: snapshot.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own autonomous dynamic state");
  }
  const sourceId = sourceKey(snapshot.sourceId);
  if (!sourceId) throw new Error("Invalid persisted Kaira activity dynamic state");
  return {
    schemaVersion: 1,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    state: projectKairaActivityDynamicState(snapshot.state),
    observedAt: canonicalTime(String(snapshot.observedAt || "")),
    sourceId,
  };
}

export async function loadKairaActivityDynamicState(input: {
  kairaInstanceId: string;
}): Promise<KairaActivityDynamicStateSnapshot | null> {
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId });
  const snapshot = await getDoc(doc(db, COLLECTION, instance.instanceId));
  if (!snapshot.exists()) return null;
  return normalizeSnapshot(snapshot.data());
}

export async function saveKairaActivityDynamicStateAtomic(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  state: DroitDynamicState;
  observedAt: string;
  sourceId: string;
}): Promise<{ status: "saved" | "replayed" | "stale"; snapshot: KairaActivityDynamicStateSnapshot }> {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own autonomous dynamic state");
  }
  const sourceId = sourceKey(input.sourceId);
  if (!sourceId) throw new Error("Invalid Kaira activity dynamic state source");
  const next: KairaActivityDynamicStateSnapshot = {
    schemaVersion: 1,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    state: projectKairaActivityDynamicState(input.state),
    observedAt: canonicalTime(input.observedAt),
    sourceId,
  };
  const ref = doc(db, COLLECTION, instance.instanceId);
  return runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(ref);
    if (currentSnapshot.exists()) {
      const current = normalizeSnapshot(currentSnapshot.data());
      const currentMs = Date.parse(current.observedAt);
      const nextMs = Date.parse(next.observedAt);
      if (currentMs > nextMs) return { status: "stale", snapshot: current } as const;
      if (currentMs === nextMs) {
        if (current.sourceId !== next.sourceId || JSON.stringify(current.state) !== JSON.stringify(next.state)) {
          throw new Error("Kaira activity dynamic state timestamp conflict");
        }
        return { status: "replayed", snapshot: current } as const;
      }
    }
    transaction.set(ref, next);
    return { status: "saved", snapshot: next } as const;
  });
}
