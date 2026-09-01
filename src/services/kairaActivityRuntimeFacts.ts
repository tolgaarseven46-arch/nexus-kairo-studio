import type { DroitDynamicState } from "../types/nexus";
import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import type { KairaActivityScheduleRecord } from "./kairaActivitySchedule";
import type {
  KairaActivityCatalogEntry,
  KairaActivityCatalogRuntimeContext,
  KairaActivityRuntimeAssessment,
} from "./kairaActivityCatalogAuthority";

export interface KairaActivityWorldRuntimeFact {
  catalogId: string;
  capabilityFacts?: Record<string, boolean>;
  accessible: boolean;
  baseContextFit: number;
  baseRisk: number;
  evidenceIds: string[];
}

export interface KairaActivityRuntimeProjectionInput {
  catalog: KairaActivityCatalogEntry[];
  worldFacts: KairaActivityWorldRuntimeFact[];
  activeExecutions: KairaActivityExecutionRecord[];
  schedules: KairaActivityScheduleRecord[];
  dynamicState: DroitDynamicState;
  now: string;
  defaultWindowMinutes?: number;
}

const key = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

const strictUnit = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) return fallback;
  return numeric;
};

const stateUnit = (value: unknown, fallback = 0) => {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric / 100));
};

function executionLoad(records: KairaActivityExecutionRecord[]): number {
  const active = records.filter((record) => record.phase === "active").length;
  const pending = records.filter((record) => record.phase === "planned").length;
  return Math.max(0, Math.min(1, active * 0.75 + pending * 0.2));
}

function schedulePressure(records: KairaActivityScheduleRecord[], nowMs: number): number {
  let pressure = 0;
  for (const record of records) {
    if (record.status !== "scheduled") continue;
    const dueMs = Date.parse(record.notBefore);
    if (!Number.isFinite(dueMs)) continue;
    const minutes = Math.abs(dueMs - nowMs) / 60_000;
    if (minutes <= 15) pressure += 0.45;
    else if (minutes <= 60) pressure += 0.25;
    else if (minutes <= 180) pressure += 0.1;
  }
  return Math.max(0, Math.min(1, pressure));
}

function statePressure(state: DroitDynamicState): number {
  const stress = stateUnit(state.stress);
  const anger = stateUnit(state.anger);
  const calmness = stateUnit(state.calmness, 0.5);
  return Math.max(0, Math.min(1, stress * 0.55 + anger * 0.25 + (1 - calmness) * 0.2));
}

function runtimeWindow(input: {
  catalogId: string;
  schedules: KairaActivityScheduleRecord[];
  nowMs: number;
  defaultWindowMinutes: number;
}) {
  const scheduled = input.schedules.find((record) =>
    record.activityId === input.catalogId && record.status === "scheduled",
  );
  if (scheduled) {
    return {
      notBefore: scheduled.notBefore,
      ...(scheduled.expiresAt ? { expiresAt: scheduled.expiresAt } : {}),
      evidenceId: `schedule:${scheduled.activityId}:${scheduled.status}`,
    };
  }
  const notBefore = new Date(input.nowMs).toISOString();
  const expiresAt = new Date(input.nowMs + input.defaultWindowMinutes * 60_000).toISOString();
  return { notBefore, expiresAt, evidenceId: "runtime:default_window" };
}

/**
 * Read-model projection over canonical upstream facts. It owns no world truth,
 * schedule, execution or dynamic state. It only converts those snapshots into
 * the exact ephemeral assessment shape consumed by the catalog authority.
 */
export function projectKairaActivityRuntimeFacts(
  input: KairaActivityRuntimeProjectionInput,
): KairaActivityCatalogRuntimeContext {
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity runtime projection time");
  const defaultWindowMinutes = Math.max(15, Math.min(24 * 60, input.defaultWindowMinutes || 120));

  const catalogIds = input.catalog.map((entry) => key(entry.catalogId));
  if (new Set(catalogIds).size !== catalogIds.length) {
    throw new Error("Duplicate Kaira activity runtime catalog id");
  }

  const worldById = new Map<string, KairaActivityWorldRuntimeFact>();
  for (const fact of input.worldFacts) {
    const catalogId = key(fact.catalogId);
    if (!catalogId) continue;
    if (worldById.has(catalogId)) throw new Error("Duplicate Kaira activity world runtime fact");
    worldById.set(catalogId, fact);
  }

  const load = executionLoad(input.activeExecutions);
  const scheduleLoad = schedulePressure(input.schedules, nowMs);
  const emotionalLoad = statePressure(input.dynamicState);
  const interruptionCost = Math.max(load, scheduleLoad, emotionalLoad);

  const capabilities: Record<string, boolean> = {};
  const assessments: KairaActivityRuntimeAssessment[] = [];

  for (const entry of input.catalog) {
    const catalogId = key(entry.catalogId);
    const world = worldById.get(catalogId);
    if (!world) continue;

    for (const [capability, value] of Object.entries(world.capabilityFacts || {})) {
      const capabilityKey = key(capability);
      if (!capabilityKey) continue;
      if (capabilityKey in capabilities && capabilities[capabilityKey] !== (value === true)) {
        throw new Error("Conflicting Kaira activity capability runtime fact");
      }
      capabilities[capabilityKey] = value === true;
    }

    const window = runtimeWindow({
      catalogId,
      schedules: input.schedules,
      nowMs,
      defaultWindowMinutes,
    });
    const contextualFit = strictUnit(world.baseContextFit, 0);
    const risk = strictUnit(world.baseRisk, 1);
    const available = world.accessible === true && interruptionCost < 0.92;

    assessments.push({
      catalogId,
      availability: available ? "available" : "blocked",
      contextualFit: contextualFit * (1 - Math.min(0.8, emotionalLoad * 0.5)),
      interruptionCost,
      risk,
      notBefore: window.notBefore,
      ...(window.expiresAt ? { expiresAt: window.expiresAt } : {}),
      evidenceIds: Array.from(new Set([
        ...world.evidenceIds.map(key).filter(Boolean),
        window.evidenceId,
        `execution_load:${load.toFixed(3)}`,
        `schedule_load:${scheduleLoad.toFixed(3)}`,
        `state_pressure:${emotionalLoad.toFixed(3)}`,
      ])),
    });
  }

  return { capabilities, assessments };
}
