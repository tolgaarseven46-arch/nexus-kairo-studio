import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import {
  normalizeKairaActivityEnvironmentSnapshot,
  type KairaActivityEnvironmentSnapshot,
} from "./kairaActivityEnvironmentAuthority";

const COLLECTION = "kairaActivityEnvironments";

export type KairaActivityEnvironmentSaveResult = {
  status: "created" | "updated" | "replayed";
  snapshot: KairaActivityEnvironmentSnapshot;
};

export type KairaActivityEnvironmentProvisionResult = {
  status: "provisioned" | "refreshed" | "existing";
  snapshot: KairaActivityEnvironmentSnapshot;
};

const semanticSnapshot = (snapshot: KairaActivityEnvironmentSnapshot) =>
  JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    kairaInstanceId: snapshot.kairaInstanceId,
    observedAt: snapshot.observedAt,
    entries: snapshot.entries,
  });

/**
 * Trusted environment write boundary. Newer observations may replace older
 * ones; stale writes and same-timestamp semantic conflicts fail closed.
 */
export async function saveKairaActivityEnvironmentSnapshot(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  authority: "kaira_environment_controller";
  snapshot: KairaActivityEnvironmentSnapshot;
}): Promise<KairaActivityEnvironmentSaveResult> {
  if (input.authority !== "kaira_environment_controller") {
    throw new Error("Invalid Kaira activity environment authority");
  }
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own activity environment");
  }
  const snapshot = normalizeKairaActivityEnvironmentSnapshot(input.snapshot);
  if (snapshot.kairaInstanceId !== instance.instanceId) {
    throw new Error("Kaira activity environment owner mismatch");
  }

  const ref = doc(db, COLLECTION, instance.instanceId);
  return runTransaction(db, async (transaction) => {
    const existingDoc = await transaction.get(ref);
    if (!existingDoc.exists()) {
      transaction.set(ref, snapshot);
      return { status: "created" as const, snapshot };
    }

    const existing = normalizeKairaActivityEnvironmentSnapshot(
      existingDoc.data() as KairaActivityEnvironmentSnapshot,
    );
    const existingTime = Date.parse(existing.observedAt);
    const incomingTime = Date.parse(snapshot.observedAt);
    if (incomingTime < existingTime) {
      throw new Error("Stale Kaira activity environment snapshot");
    }
    if (incomingTime === existingTime) {
      if (semanticSnapshot(existing) !== semanticSnapshot(snapshot)) {
        throw new Error("Kaira activity environment snapshot conflict");
      }
      return { status: "replayed" as const, snapshot: existing };
    }

    transaction.set(ref, snapshot);
    return { status: "updated" as const, snapshot };
  });
}

export async function loadKairaActivityEnvironmentSnapshot(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
}): Promise<KairaActivityEnvironmentSnapshot | null> {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, instance.instanceId));
  if (!snapshot.exists()) return null;
  try {
    const normalized = normalizeKairaActivityEnvironmentSnapshot(
      snapshot.data() as KairaActivityEnvironmentSnapshot,
    );
    return normalized.kairaInstanceId === instance.instanceId ? normalized : null;
  } catch {
    return null;
  }
}

/**
 * Creates a built-in instance environment once and refreshes only that exact
 * built-in semantic snapshot. Instance-authored environment facts are never
 * replaced by bootstrap data.
 */
export async function provisionOrRefreshKairaActivityEnvironmentAtomic(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  snapshot: KairaActivityEnvironmentSnapshot;
}): Promise<KairaActivityEnvironmentProvisionResult> {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own activity environment");
  }
  const next = normalizeKairaActivityEnvironmentSnapshot(input.snapshot);
  if (next.kairaInstanceId !== instance.instanceId) {
    throw new Error("Kaira activity environment owner mismatch");
  }
  const ref = doc(db, COLLECTION, instance.instanceId);
  return runTransaction(db, async (transaction) => {
    const currentDoc = await transaction.get(ref);
    if (!currentDoc.exists()) {
      transaction.set(ref, next);
      return { status: "provisioned", snapshot: next } as const;
    }
    const current = normalizeKairaActivityEnvironmentSnapshot(
      currentDoc.data() as KairaActivityEnvironmentSnapshot,
    );
    if (current.kairaInstanceId !== next.kairaInstanceId) {
      throw new Error("Kaira activity environment owner mismatch");
    }
    if (JSON.stringify(current.entries) !== JSON.stringify(next.entries)) {
      return { status: "existing", snapshot: current } as const;
    }
    if (Date.parse(next.observedAt) <= Date.parse(current.observedAt)) {
      return { status: "existing", snapshot: current } as const;
    }
    transaction.set(ref, next);
    return { status: "refreshed", snapshot: next } as const;
  });
}
