import type { WorldEventObservation } from "./worldModelEventStore";
import {
  retrieveTemporalNeighbors,
  type TemporalNeighborDirection,
} from "./worldEventTemporalGraph";

export type DiscourseAnchorStatus = "resolved" | "unresolved" | "ambiguous";

export interface DiscourseTemporalAnchorResolution {
  status: DiscourseAnchorStatus;
  direction?: TemporalNeighborDirection;
  anchorObservationId?: string;
  reason:
    | "no_temporal_discourse_marker"
    | "no_same_session_observation"
    | "latest_observation_missing_id"
    | "latest_observation_time_ambiguous"
    | "resolved_latest_same_session_observation";
}

export interface DiscourseTemporalRetrievalResult {
  resolution: DiscourseTemporalAnchorResolution;
  observations: WorldEventObservation[];
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

const AFTER_RE = /\b(?:ondan\s+sonra|sonra\s+ne\s+oldu|peki\s+sonra|sonrasında|daha\s+sonra)\b/iu;
const BEFORE_RE = /\b(?:ondan\s+önce|önce\s+ne\s+oldu|öncesinde|daha\s+önce)\b/iu;

export function detectTemporalDiscourseDirection(
  message: string,
): TemporalNeighborDirection | undefined {
  const text = normalize(message);
  if (AFTER_RE.test(text)) return "after";
  if (BEFORE_RE.test(text)) return "before";
  return undefined;
}

/**
 * Resolves only explicit temporal discourse continuations. The resolver never
 * scans older turns for a "better" semantic fit: the unique latest persisted
 * observation in the same session is the only admissible implicit anchor.
 */
export function resolveDiscourseTemporalAnchor(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
}): DiscourseTemporalAnchorResolution {
  const direction = detectTemporalDiscourseDirection(input.message);
  if (!direction) {
    return { status: "unresolved", reason: "no_temporal_discourse_marker" };
  }

  const sameSession = input.observations
    .filter((item) => item.sessionId === input.sessionId)
    .map((item) => ({ item, time: Date.parse(item.createdAt) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time);

  if (!sameSession.length) {
    return {
      status: "unresolved",
      direction,
      reason: "no_same_session_observation",
    };
  }

  const latestTime = sameSession[0].time;
  const latest = sameSession.filter((entry) => entry.time === latestTime);
  if (latest.length !== 1) {
    return {
      status: "ambiguous",
      direction,
      reason: "latest_observation_time_ambiguous",
    };
  }

  const anchorObservationId = latest[0].item.id;
  if (!anchorObservationId) {
    return {
      status: "unresolved",
      direction,
      reason: "latest_observation_missing_id",
    };
  }

  return {
    status: "resolved",
    direction,
    anchorObservationId,
    reason: "resolved_latest_same_session_observation",
  };
}

export function retrieveTemporalDiscourseNeighbors(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
}): DiscourseTemporalRetrievalResult {
  const resolution = resolveDiscourseTemporalAnchor(input);
  if (
    resolution.status !== "resolved" ||
    !resolution.anchorObservationId ||
    !resolution.direction
  ) {
    return { resolution, observations: [] };
  }

  return {
    resolution,
    observations: retrieveTemporalNeighbors(
      input.observations,
      resolution.anchorObservationId,
      resolution.direction,
    ),
  };
}
