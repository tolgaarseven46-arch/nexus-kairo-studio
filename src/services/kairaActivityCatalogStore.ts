import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  normalizeKairaActivityCatalog,
  type KairaActivityCatalogEntry,
} from "./kairaActivityCatalogAuthority";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";

const COLLECTION = "kairaActivityCatalog";
const MAX_CATALOG_ENTRIES = 100;

export interface KairaActivityCatalogSnapshot {
  schemaVersion: 1;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  catalogVersion: string;
  entries: KairaActivityCatalogEntry[];
  publishedAt: string;
}

const versionKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

function canonicalPublishedAt(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid Kaira activity catalog publish time");
  return new Date(parsed).toISOString();
}

export function createKairaActivityCatalogSnapshot(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  catalogVersion: string;
  entries: KairaActivityCatalogEntry[];
  publishedAt: string;
}): KairaActivityCatalogSnapshot {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own activity catalog");
  }
  const catalogVersion = versionKey(input.catalogVersion);
  if (!catalogVersion) throw new Error("Invalid Kaira activity catalog version");
  if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > MAX_CATALOG_ENTRIES) {
    throw new Error("Invalid Kaira activity catalog size");
  }
  return {
    schemaVersion: 1,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    catalogVersion,
    entries: normalizeKairaActivityCatalog(input.entries),
    publishedAt: canonicalPublishedAt(input.publishedAt),
  };
}

function normalizeStoredSnapshot(value: unknown): KairaActivityCatalogSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid persisted Kaira activity catalog");
  const snapshot = value as Partial<KairaActivityCatalogSnapshot>;
  if (snapshot.schemaVersion !== 1) throw new Error("Unsupported Kaira activity catalog schema");
  return createKairaActivityCatalogSnapshot({
    kairaInstanceId: String(snapshot.kairaInstanceId || ""),
    instanceType: snapshot.instanceType as KairaInstanceContext["instanceType"],
    catalogVersion: String(snapshot.catalogVersion || ""),
    entries: Array.isArray(snapshot.entries) ? snapshot.entries as KairaActivityCatalogEntry[] : [],
    publishedAt: String(snapshot.publishedAt || ""),
  });
}

/** Instance-owned stable activity semantics. Runtime availability belongs elsewhere. */
export async function loadActiveKairaActivityCatalog(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
}): Promise<KairaActivityCatalogSnapshot | null> {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, instance.instanceId));
  if (!snapshot.exists()) return null;
  const normalized = normalizeStoredSnapshot(snapshot.data());
  return normalized.kairaInstanceId === instance.instanceId && normalized.instanceType === instance.instanceType
    ? normalized
    : null;
}

/**
 * Atomic whole-snapshot publish. A stale deploy cannot silently overwrite a newer
 * catalog version; exact retries are idempotent.
 */
export async function publishKairaActivityCatalogAtomic(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  catalogVersion: string;
  entries: KairaActivityCatalogEntry[];
  publishedAt: string;
}): Promise<{ status: "published" | "replayed"; snapshot: KairaActivityCatalogSnapshot }> {
  const next = createKairaActivityCatalogSnapshot(input);
  const ref = doc(db, COLLECTION, next.kairaInstanceId);
  return runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(ref);
    if (currentSnapshot.exists()) {
      const current = normalizeStoredSnapshot(currentSnapshot.data());
      if (current.catalogVersion === next.catalogVersion) {
        if (JSON.stringify(current.entries) !== JSON.stringify(next.entries)) {
          throw new Error("Kaira activity catalog version conflict");
        }
        return { status: "replayed", snapshot: current } as const;
      }
      const currentMs = Date.parse(current.publishedAt);
      const nextMs = Date.parse(next.publishedAt);
      if (currentMs > nextMs) throw new Error("Stale Kaira activity catalog publish");
    }
    transaction.set(ref, next);
    return { status: "published", snapshot: next } as const;
  });
}

/** Creates deterministic bootstrap semantics once and never overwrites an instance-owned catalog. */
export async function provisionKairaActivityCatalogIfMissingAtomic(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  catalogVersion: string;
  entries: KairaActivityCatalogEntry[];
  publishedAt: string;
}): Promise<{ status: "provisioned" | "existing"; snapshot: KairaActivityCatalogSnapshot }> {
  const next = createKairaActivityCatalogSnapshot(input);
  const ref = doc(db, COLLECTION, next.kairaInstanceId);
  return runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(ref);
    if (currentSnapshot.exists()) {
      const current = normalizeStoredSnapshot(currentSnapshot.data());
      if (current.kairaInstanceId !== next.kairaInstanceId || current.instanceType !== next.instanceType) {
        throw new Error("Kaira activity catalog owner mismatch");
      }
      return { status: "existing", snapshot: current } as const;
    }
    transaction.set(ref, next);
    return { status: "provisioned", snapshot: next } as const;
  });
}
