import { resolveKairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import type { KairaActivityWorldRuntimeFact } from "./kairaActivityRuntimeFacts";

export interface KairaActivityEnvironmentEntry {
  catalogId: string;
  accessible: boolean;
  capabilities?: Record<string, boolean>;
  contextFit: number;
  risk: number;
  evidenceIds: string[];
}

export interface KairaActivityEnvironmentSnapshot {
  schemaVersion: 1;
  kairaInstanceId: string;
  observedAt: string;
  entries: KairaActivityEnvironmentEntry[];
}

const key = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

const strictUnit = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

function normalizedCapabilities(input: Record<string, boolean> | undefined) {
  const result: Record<string, boolean> = {};
  for (const [rawKey, value] of Object.entries(input || {})) {
    const capability = key(rawKey);
    if (!capability) continue;
    if (capability in result && result[capability] !== (value === true)) {
      throw new Error("Conflicting Kaira activity environment capability");
    }
    result[capability] = value === true;
  }
  return result;
}

/** Canonical structural validation used by both persistence and projection. */
export function normalizeKairaActivityEnvironmentSnapshot(
  snapshot: KairaActivityEnvironmentSnapshot,
): KairaActivityEnvironmentSnapshot {
  if (snapshot.schemaVersion !== 1) {
    throw new Error("Unsupported Kaira activity environment schema");
  }
  const instance = resolveKairaInstanceContext({ instanceId: snapshot.kairaInstanceId });
  const observedAtMs = Date.parse(snapshot.observedAt);
  if (!Number.isFinite(observedAtMs)) throw new Error("Invalid Kaira activity environment time");

  const seen = new Set<string>();
  const entries: KairaActivityEnvironmentEntry[] = snapshot.entries.map((entry) => {
    const catalogId = key(entry.catalogId);
    if (!catalogId) throw new Error("Invalid Kaira activity environment catalog id");
    if (seen.has(catalogId)) throw new Error("Duplicate Kaira activity environment entry");
    seen.add(catalogId);
    if (!strictUnit(entry.contextFit) || !strictUnit(entry.risk)) {
      throw new Error("Invalid Kaira activity environment assessment");
    }
    const evidenceIds = Array.from(new Set(entry.evidenceIds.map(key).filter(Boolean)));
    if (!evidenceIds.length) throw new Error("Kaira activity environment evidence required");
    return {
      catalogId,
      accessible: entry.accessible === true,
      capabilities: normalizedCapabilities(entry.capabilities),
      contextFit: entry.contextFit,
      risk: entry.risk,
      evidenceIds,
    };
  });

  return {
    schemaVersion: 1,
    kairaInstanceId: instance.instanceId,
    observedAt: new Date(observedAtMs).toISOString(),
    entries,
  };
}

/**
 * Environment/platform authority boundary for activity capability/access facts.
 * It never parses conversation/world-event prose and never interprets activity
 * names. Missing entries remain unknown and therefore cannot create candidates.
 */
export function projectKairaActivityEnvironmentSnapshot(input: {
  kairaInstanceId: string;
  catalog: KairaActivityCatalogEntry[];
  snapshot: KairaActivityEnvironmentSnapshot;
  now: string;
  maxAgeMinutes?: number;
}): KairaActivityWorldRuntimeFact[] {
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId });
  const snapshot = normalizeKairaActivityEnvironmentSnapshot(input.snapshot);
  if (instance.instanceId !== snapshot.kairaInstanceId) {
    throw new Error("Kaira activity environment owner mismatch");
  }

  const observedAtMs = Date.parse(snapshot.observedAt);
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity environment time");
  const maxAgeMinutes = Math.max(1, Math.min(24 * 60, input.maxAgeMinutes || 30));
  if (observedAtMs > nowMs + 60_000 || nowMs - observedAtMs > maxAgeMinutes * 60_000) {
    return [];
  }

  const catalogIds = new Set(input.catalog.map((entry) => key(entry.catalogId)).filter(Boolean));
  const result: KairaActivityWorldRuntimeFact[] = [];

  for (const entry of snapshot.entries) {
    if (!catalogIds.has(entry.catalogId)) continue;
    result.push({
      catalogId: entry.catalogId,
      capabilityFacts: { ...(entry.capabilities || {}) },
      accessible: entry.accessible,
      baseContextFit: entry.contextFit,
      baseRisk: entry.risk,
      evidenceIds: Array.from(new Set([
        ...entry.evidenceIds,
        `environment_snapshot:${snapshot.observedAt}`,
      ])),
    });
  }
  return result;
}
