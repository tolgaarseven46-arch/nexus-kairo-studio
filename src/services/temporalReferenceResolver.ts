import type { WorldEventTemporalReference } from "./worldEventEngine";

export type TemporalPrecision = "day" | "week" | "instant" | "unknown";

export interface ResolvedTemporalInterval {
  startAt: string;
  endAt: string;
  precision: TemporalPrecision;
  anchorAt: string;
  source: "relative_marker" | "explicit_date" | "relation_fallback";
}

const DAY_MS = 24 * 60 * 60 * 1000;

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

/**
 * Resolves bounded Turkish temporal expressions against an explicit anchor.
 * It never guesses an interval for vague expressions such as "önce" or
 * "sonra" without a measurable offset; those stay unresolved instead of
 * inventing time.
 */
export function resolveTemporalReference(
  message: string,
  temporal: WorldEventTemporalReference | undefined,
  anchorAt: string,
): ResolvedTemporalInterval | undefined {
  const anchor = new Date(anchorAt);
  if (!Number.isFinite(anchor.getTime())) return undefined;
  const text = normalize(message);

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
