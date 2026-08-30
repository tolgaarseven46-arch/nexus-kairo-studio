import type {
  WorldEventTemporalOffsetUnit,
  WorldEventTemporalReference,
  WorldEventResolvedTemporalInterval,
} from "./worldEventEngine";

export type TemporalPrecision = "day" | "week" | "hour" | "minute" | "instant" | "unknown";
export type ResolvedTemporalInterval = WorldEventResolvedTemporalInterval;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const intervalForDayOffset = (anchor: Date, offset: number): ResolvedTemporalInterval => {
  const start = new Date(startOfUtcDay(anchor).getTime() + offset * DAY_MS);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    precision: "day",
    anchorAt: anchor.toISOString(),
    source: "relative_marker",
  };
};

const intervalForPreviousWeek = (anchor: Date): ResolvedTemporalInterval => {
  const day = startOfUtcDay(anchor);
  const mondayOffset = (day.getUTCDay() + 6) % 7;
  const currentMonday = new Date(day.getTime() - mondayOffset * DAY_MS);
  const start = new Date(currentMonday.getTime() - 7 * DAY_MS);
  const end = new Date(currentMonday.getTime() - 1);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    precision: "week",
    anchorAt: anchor.toISOString(),
    source: "relative_marker",
  };
};

const EXPLICIT_DATE_RE = /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/u;

function explicitDateInterval(text: string, anchor: Date): ResolvedTemporalInterval | undefined {
  const match = text.match(EXPLICIT_DATE_RE);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) return undefined;
  const end = new Date(start.getTime() + DAY_MS - 1);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    precision: "day",
    anchorAt: anchor.toISOString(),
    source: "explicit_date",
  };
}

function unitMs(unit: WorldEventTemporalOffsetUnit): number {
  if (unit === "minute") return MINUTE_MS;
  if (unit === "hour") return HOUR_MS;
  if (unit === "day") return DAY_MS;
  return 7 * DAY_MS;
}

function precisionForUnit(unit: WorldEventTemporalOffsetUnit): TemporalPrecision {
  if (unit === "minute") return "minute";
  if (unit === "hour") return "hour";
  if (unit === "day") return "day";
  return "week";
}

function intervalAroundInstant(
  instantMs: number,
  unit: WorldEventTemporalOffsetUnit,
  anchorAt: string,
  source: ResolvedTemporalInterval["source"],
): ResolvedTemporalInterval {
  const precision = precisionForUnit(unit);
  if (unit === "day") {
    const day = startOfUtcDay(new Date(instantMs));
    return {
      startAt: day.toISOString(),
      endAt: new Date(day.getTime() + DAY_MS - 1).toISOString(),
      precision,
      anchorAt,
      source,
    };
  }
  if (unit === "week") {
    const day = startOfUtcDay(new Date(instantMs));
    const mondayOffset = (day.getUTCDay() + 6) % 7;
    const monday = new Date(day.getTime() - mondayOffset * DAY_MS);
    return {
      startAt: monday.toISOString(),
      endAt: new Date(monday.getTime() + 7 * DAY_MS - 1).toISOString(),
      precision,
      anchorAt,
      source,
    };
  }
  return {
    startAt: new Date(instantMs).toISOString(),
    endAt: new Date(instantMs).toISOString(),
    precision,
    anchorAt,
    source,
  };
}

function resolveDependency(
  temporal: WorldEventTemporalReference,
  observationAnchor: Date,
  referenceInterval?: ResolvedTemporalInterval,
): ResolvedTemporalInterval | undefined {
  const dependency = temporal.dependency;
  if (!dependency) return undefined;

  if (dependency.anchor === "previous_event") {
    if (!referenceInterval) return undefined;
    if (!dependency.offsetAmount || !dependency.offsetUnit) return undefined;
    const referenceBase = dependency.direction === "after"
      ? Date.parse(referenceInterval.endAt)
      : Date.parse(referenceInterval.startAt);
    if (!Number.isFinite(referenceBase)) return undefined;
    const delta = dependency.offsetAmount * unitMs(dependency.offsetUnit);
    const instant = dependency.direction === "after" ? referenceBase + delta : referenceBase - delta;
    return intervalAroundInstant(
      instant,
      dependency.offsetUnit,
      referenceInterval.endAt,
      "referenced_event",
    );
  }

  if (!dependency.offsetAmount || !dependency.offsetUnit) return undefined;
  const direction = dependency.direction === "before" ? -1 : 1;
  const instant = observationAnchor.getTime() + direction * dependency.offsetAmount * unitMs(dependency.offsetUnit);
  return intervalAroundInstant(
    instant,
    dependency.offsetUnit,
    observationAnchor.toISOString(),
    "relative_offset",
  );
}

/**
 * Resolves bounded Turkish temporal expressions against an explicit observation
 * anchor. Expressions that depend on another event remain unresolved until a
 * reference interval is explicitly supplied; no synthetic time is invented.
 */
export function resolveTemporalReference(
  message: string,
  temporal: WorldEventTemporalReference | undefined,
  anchorAt: string,
  referenceInterval?: ResolvedTemporalInterval,
): ResolvedTemporalInterval | undefined {
  const anchor = new Date(anchorAt);
  if (!Number.isFinite(anchor.getTime())) return undefined;
  const text = normalize(message);

  const dependencyResolved = temporal ? resolveDependency(temporal, anchor, referenceInterval) : undefined;
  if (dependencyResolved) return dependencyResolved;
  if (temporal?.dependency?.anchor === "previous_event") return undefined;

  const explicit = explicitDateInterval(text, anchor);
  if (explicit) return explicit;

  if (/\bgeçen\s+hafta\b/iu.test(text)) return intervalForPreviousWeek(anchor);
  if (/\bdün\b/iu.test(text)) return intervalForDayOffset(anchor, -1);
  if (/\bbugün\b/iu.test(text)) return intervalForDayOffset(anchor, 0);
  if (/\byarın\b/iu.test(text)) return intervalForDayOffset(anchor, 1);

  if (/\b(?:şimdi|şu an|halen|hâlen)\b/iu.test(text) || temporal?.relation === "present") {
    return {
      startAt: anchor.toISOString(),
      endAt: anchor.toISOString(),
      precision: "instant",
      anchorAt: anchor.toISOString(),
      source: "relation_fallback",
    };
  }

  return undefined;
}

export function temporalIntervalContains(
  interval: ResolvedTemporalInterval,
  instant: string,
): boolean {
  const value = Date.parse(instant);
  const start = Date.parse(interval.startAt);
  const end = Date.parse(interval.endAt);
  return Number.isFinite(value) && Number.isFinite(start) && Number.isFinite(end) && value >= start && value <= end;
}
