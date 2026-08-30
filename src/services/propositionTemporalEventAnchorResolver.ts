import type { WorldEventObservation } from "./worldModelEventStore";
import {
  detectWorldEventPolarity,
  type WorldEventPolarity,
  type WorldEventType,
} from "./worldEventEngine";
import {
  detectExplicitTemporalRelationDirection,
  detectMentionedWorldEventType,
} from "./explicitTemporalEventAnchorResolver";
import {
  retrieveTemporalNeighbors,
  type TemporalNeighborDirection,
} from "./worldEventTemporalGraph";

export type PropositionTemporalAnchorStatus = "resolved" | "unresolved" | "ambiguous";

export interface PropositionTemporalAnchorResolution {
  status: PropositionTemporalAnchorStatus;
  direction?: TemporalNeighborDirection;
  anchorObservationId?: string;
  candidateObservationIds?: string[];
  matchedActorNames?: string[];
  matchedEventType?: WorldEventType;
  matchedPolarity?: WorldEventPolarity;
  firstPersonTarget?: boolean;
  reason:
    | "no_proposition_anchor"
    | "no_same_session_candidate"
    | "proposition_not_unique"
    | "resolved_proposition_anchor";
}

export interface PropositionTemporalAnchorRetrievalResult {
  resolution: PropositionTemporalAnchorResolution;
  observations: WorldEventObservation[];
}

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const FIRST_PERSON_TARGET_RE = /(?:^|\s)(?:bana|beni|benim|ben)(?=\s|$)/iu;

function actorName(observation: WorldEventObservation): string | undefined {
  const name = observation.event.actor?.name;
  return name ? normalize(name) : undefined;
}

function isFirstPersonTarget(observation: WorldEventObservation): boolean {
  const target = observation.event.target;
  return target?.id === "current_user" || target?.source === "first_person";
}

/**
 * Resolves a temporal anchor from bounded canonical proposition components.
 * It is deliberately stricter than the named-event resolver: a canonical
 * predicate and an explicit actor name are required. First-person target and
 * polarity refine the candidate set when present. No recency tie-break exists.
 */
export function resolvePropositionTemporalEventAnchor(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
}): PropositionTemporalAnchorResolution {
  const direction = detectExplicitTemporalRelationDirection(input.message);
  const matchedEventType = detectMentionedWorldEventType(input.message);
  if (!direction || !matchedEventType) {
    return { status: "unresolved", reason: "no_proposition_anchor" };
  }

  const query = normalize(input.message);
  const sameSession = input.observations.filter(
    (item) => item.sessionId === input.sessionId && Boolean(item.id),
  );
  if (!sameSession.length) {
    return {
      status: "unresolved",
      direction,
      matchedEventType,
      reason: "no_same_session_candidate",
    };
  }

  const knownActorNames = [...new Set(
    sameSession.map(actorName).filter((value): value is string => Boolean(value)),
  )];
  const matchedActorNames = knownActorNames.filter((name) => query.includes(name));
  if (matchedActorNames.length !== 1) {
    return {
      status: matchedActorNames.length > 1 ? "ambiguous" : "unresolved",
      direction,
      matchedEventType,
      ...(matchedActorNames.length ? { matchedActorNames } : {}),
      reason: matchedActorNames.length > 1 ? "proposition_not_unique" : "no_proposition_anchor",
    };
  }

  const firstPersonTarget = FIRST_PERSON_TARGET_RE.test(query);
  const matchedPolarity = detectWorldEventPolarity(input.message);
  let candidates = sameSession.filter(
    (item) =>
      actorName(item) === matchedActorNames[0] &&
      item.event.eventType === matchedEventType,
  );

  if (firstPersonTarget) {
    candidates = candidates.filter(isFirstPersonTarget);
  }

  candidates = candidates.filter(
    (item) => !item.event.polarity || item.event.polarity === matchedPolarity,
  );

  const candidateObservationIds = candidates
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  if (!candidateObservationIds.length) {
    return {
      status: "unresolved",
      direction,
      matchedActorNames,
      matchedEventType,
      matchedPolarity,
      firstPersonTarget,
      reason: "no_same_session_candidate",
    };
  }

  if (candidateObservationIds.length > 1) {
    return {
      status: "ambiguous",
      direction,
      candidateObservationIds,
      matchedActorNames,
      matchedEventType,
      matchedPolarity,
      firstPersonTarget,
      reason: "proposition_not_unique",
    };
  }

  return {
    status: "resolved",
    direction,
    anchorObservationId: candidateObservationIds[0],
    candidateObservationIds,
    matchedActorNames,
    matchedEventType,
    matchedPolarity,
    firstPersonTarget,
    reason: "resolved_proposition_anchor",
  };
}

export function retrievePropositionTemporalEventNeighbors(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
}): PropositionTemporalAnchorRetrievalResult {
  const resolution = resolvePropositionTemporalEventAnchor(input);
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
