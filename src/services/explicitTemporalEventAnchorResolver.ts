import type { WorldEventObservation } from "./worldModelEventStore";
import {
  retrieveTemporalNeighbors,
  type TemporalNeighborDirection,
} from "./worldEventTemporalGraph";
import type { WorldEventType } from "./worldEventEngine";

export type ExplicitTemporalAnchorStatus = "resolved" | "unresolved" | "ambiguous";

export interface ExplicitTemporalAnchorResolution {
  status: ExplicitTemporalAnchorStatus;
  direction?: TemporalNeighborDirection;
  anchorObservationId?: string;
  candidateObservationIds?: string[];
  matchedNames?: string[];
  matchedEventType?: WorldEventType;
  reason:
    | "no_explicit_temporal_anchor"
    | "no_same_session_candidate"
    | "named_anchor_not_unique"
    | "matched_event_not_unique"
    | "resolved_explicit_event_anchor";
}

export interface ExplicitTemporalAnchorRetrievalResult {
  resolution: ExplicitTemporalAnchorResolution;
  observations: WorldEventObservation[];
}

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const EVENT_TYPE_MARKERS: Partial<Record<WorldEventType, RegExp>> = {
  insult: /\b(?:hakaret|salak|aptal|mal)\w*\b/iu,
  support: /\b(?:destek|yanında|yardım)\w*\b/iu,
  compliment: /\b(?:iltifat|övg|övd|güzel)\w*\b/iu,
  apology: /\b(?:özür|özr|af)\w*\b/iu,
  repair: /\b(?:barış|telafi|düzelt)\w*\b/iu,
  command: /\b(?:emir|komut)\w*\b/iu,
  rejection: /\b(?:redd|ret|istemedi|hayır)\w*\b/iu,
  emotional_share: /\b(?:duygu|üzgün|kızgın|kork|mutlu)\w*\b/iu,
};

export function detectExplicitTemporalRelationDirection(
  message: string,
): TemporalNeighborDirection | undefined {
  const text = normalize(message);
  if (/\bsonra\b/iu.test(text)) return "after";
  if (/\bönce\b/iu.test(text)) return "before";
  return undefined;
}

function participantNames(observation: WorldEventObservation): string[] {
  return [observation.event.actor?.name, observation.event.target?.name]
    .filter((value): value is string => Boolean(value))
    .map(normalize)
    .filter(Boolean);
}

function queryContainsName(query: string, name: string): boolean {
  if (!name) return false;
  return query.includes(name);
}

function detectMentionedEventType(message: string): WorldEventType | undefined {
  const text = normalize(message);
  const matches = (Object.entries(EVENT_TYPE_MARKERS) as Array<[WorldEventType, RegExp]>)
    .filter(([, marker]) => marker.test(text))
    .map(([eventType]) => eventType);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Resolves a user-specified event anchor only from canonical participant names
 * and bounded canonical event-type markers. It never chooses the most recent
 * matching event merely to break ambiguity.
 */
export function resolveExplicitTemporalEventAnchor(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
}): ExplicitTemporalAnchorResolution {
  const direction = detectExplicitTemporalRelationDirection(input.message);
  if (!direction) {
    return { status: "unresolved", reason: "no_explicit_temporal_anchor" };
  }

  const query = normalize(input.message);
  const sameSession = input.observations.filter(
    (item) => item.sessionId === input.sessionId && Boolean(item.id),
  );
  if (!sameSession.length) {
    return {
      status: "unresolved",
      direction,
      reason: "no_same_session_candidate",
    };
  }

  const allKnownNames = [...new Set(sameSession.flatMap(participantNames))];
  const matchedNames = allKnownNames.filter((name) => queryContainsName(query, name));
  if (!matchedNames.length) {
    return { status: "unresolved", direction, reason: "no_explicit_temporal_anchor" };
  }

  let candidates = sameSession.filter((item) => {
    const names = participantNames(item);
    return matchedNames.some((name) => names.includes(name));
  });

  const matchedEventType = detectMentionedEventType(input.message);
  if (matchedEventType) {
    const typed = candidates.filter((item) => item.event.eventType === matchedEventType);
    if (typed.length) candidates = typed;
  }

  const candidateObservationIds = candidates
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  if (!candidateObservationIds.length) {
    return {
      status: "unresolved",
      direction,
      matchedNames,
      ...(matchedEventType ? { matchedEventType } : {}),
      reason: "no_same_session_candidate",
    };
  }

  if (candidateObservationIds.length > 1) {
    return {
      status: "ambiguous",
      direction,
      candidateObservationIds,
      matchedNames,
      ...(matchedEventType ? { matchedEventType } : {}),
      reason: matchedEventType ? "matched_event_not_unique" : "named_anchor_not_unique",
    };
  }

  return {
    status: "resolved",
    direction,
    anchorObservationId: candidateObservationIds[0],
    candidateObservationIds,
    matchedNames,
    ...(matchedEventType ? { matchedEventType } : {}),
    reason: "resolved_explicit_event_anchor",
  };
}

export function retrieveExplicitTemporalEventNeighbors(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
}): ExplicitTemporalAnchorRetrievalResult {
  const resolution = resolveExplicitTemporalEventAnchor(input);
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
