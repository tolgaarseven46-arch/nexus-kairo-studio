import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { instancePolicy, resolveKairaInstanceContext } from "./kairaInstanceContext";
import {
  normalizeKairaActivityEnvironmentSnapshot,
  type KairaActivityEnvironmentSnapshot,
} from "./kairaActivityEnvironmentAuthority";

const COLLECTION = "kairaActivityEnvironments";

export type KairaActivityEnvironmentSaveResult = {
  status: "created" | "updated" | "replayed";
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
  authority: "kaira_environment_controller";
  snapshot: KairaActivityEnvironmentSnapshot;
}): Promise<KairaActivityEnvironmentSaveResult> {
  if (input.authority !== "kaira_environment_controller") {
    throw new Error("Invalid Kaira activity environment authority");
  }
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId });
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

export async function loadKairaActivityEnvironmentSnapshot(
  kairaInstanceId: string,
): Promise<KairaActivityEnvironmentSnapshot | null> {
  const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
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
