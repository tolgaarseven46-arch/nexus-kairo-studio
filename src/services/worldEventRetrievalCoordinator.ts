import type { WorldEventObservation } from "./worldModelEventStore";
import {
  rankWorldEventObservations,
  shouldRetrieveWorldEvents,
  type RetrievedWorldEvent,
} from "./worldEventRetrieval";
import {
  detectTemporalDiscourseDirection,
  retrieveTemporalDiscourseNeighbors,
  type DiscourseTemporalAnchorResolution,
} from "./discourseTemporalAnchorResolver";
import {
  detectExplicitTemporalRelationDirection,
  retrieveExplicitTemporalEventNeighbors,
  type ExplicitTemporalAnchorResolution,
} from "./explicitTemporalEventAnchorResolver";

export type WorldEventRetrievalMode = "none" | "ranked_recall" | "temporal_graph";

export interface CoordinatedWorldEventRetrieval {
  mode: WorldEventRetrievalMode;
  items: RetrievedWorldEvent[];
  discourseResolution?: DiscourseTemporalAnchorResolution;
  explicitAnchorResolution?: ExplicitTemporalAnchorResolution;
}

export function shouldCoordinateWorldEventRetrieval(message: string): boolean {
  return Boolean(detectExplicitTemporalRelationDirection(message)) ||
    Boolean(detectTemporalDiscourseDirection(message)) ||
    shouldRetrieveWorldEvents(message);
}

function graphItems(
  observations: WorldEventObservation[],
  anchorObservationId: string | undefined,
  direction: "before" | "after" | undefined,
  maxItems: number,
  reasonPrefix: "explicit_anchor" | "discourse_anchor",
): RetrievedWorldEvent[] {
  return observations.slice(0, maxItems).map((observation) => ({
    observation,
    score: 100,
    reasons: [
      "temporal_graph_neighbor",
      `${reasonPrefix}:${anchorObservationId || "unresolved"}`,
      `direction:${direction || "unresolved"}`,
    ],
  }));
}

/**
 * Single policy seam for world-model retrieval. Temporal event questions are
 * graph-only. Explicit named/event anchors get first priority; if no explicit
 * canonical anchor is present, the conservative latest-turn discourse resolver
 * may run. Neither path falls back to lexical ranking when anchor resolution is
 * ambiguous, unresolved or has no graph neighbor.
 */
export function coordinateWorldEventRetrieval(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
  maxItems?: number;
  queryAnchorAt?: string;
}): CoordinatedWorldEventRetrieval {
  const maxItems = Math.max(1, Math.min(input.maxItems ?? 5, 10));
  const explicitDirection = detectExplicitTemporalRelationDirection(input.message);
  if (explicitDirection) {
    const explicitResult = retrieveExplicitTemporalEventNeighbors({
      message: input.message,
      sessionId: input.sessionId,
      observations: input.observations,
    });
    if (explicitResult.resolution.reason !== "no_explicit_temporal_anchor") {
      return {
        mode: "temporal_graph",
        explicitAnchorResolution: explicitResult.resolution,
        items: graphItems(
          explicitResult.observations,
          explicitResult.resolution.anchorObservationId,
          explicitResult.resolution.direction,
          maxItems,
          "explicit_anchor",
        ),
      };
    }
  }

  const direction = detectTemporalDiscourseDirection(input.message);
  if (direction) {
    const graphResult = retrieveTemporalDiscourseNeighbors({
      message: input.message,
      sessionId: input.sessionId,
      observations: input.observations,
    });
    return {
      mode: "temporal_graph",
      discourseResolution: graphResult.resolution,
      items: graphItems(
        graphResult.observations,
        graphResult.resolution.anchorObservationId,
        direction,
        maxItems,
        "discourse_anchor",
      ),
    };
  }

  if (!shouldRetrieveWorldEvents(input.message)) {
    return { mode: "none", items: [] };
  }

  return {
    mode: "ranked_recall",
    items: rankWorldEventObservations(
      input.message,
      input.observations,
      input.maxItems ?? 5,
      input.queryAnchorAt,
    ),
  };
}
