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

export type WorldEventRetrievalMode = "none" | "ranked_recall" | "temporal_graph";

export interface CoordinatedWorldEventRetrieval {
  mode: WorldEventRetrievalMode;
  items: RetrievedWorldEvent[];
  discourseResolution?: DiscourseTemporalAnchorResolution;
}

export function shouldCoordinateWorldEventRetrieval(message: string): boolean {
  return Boolean(detectTemporalDiscourseDirection(message)) || shouldRetrieveWorldEvents(message);
}

/**
 * Single policy seam for world-model retrieval. Explicit temporal discourse is
 * graph-only: it never falls back to lexical ranking when the anchor is missing,
 * ambiguous or has no graph neighbor. Ordinary recall keeps the existing ranker.
 */
export function coordinateWorldEventRetrieval(input: {
  message: string;
  sessionId: string;
  observations: WorldEventObservation[];
  maxItems?: number;
  queryAnchorAt?: string;
}): CoordinatedWorldEventRetrieval {
  const direction = detectTemporalDiscourseDirection(input.message);
  if (direction) {
    const graphResult = retrieveTemporalDiscourseNeighbors({
      message: input.message,
      sessionId: input.sessionId,
      observations: input.observations,
    });
    const maxItems = Math.max(1, Math.min(input.maxItems ?? 5, 10));
    return {
      mode: "temporal_graph",
      discourseResolution: graphResult.resolution,
      items: graphResult.observations.slice(0, maxItems).map((observation) => ({
        observation,
        score: 100,
        reasons: [
          "temporal_graph_neighbor",
          `discourse_anchor:${graphResult.resolution.anchorObservationId || "unresolved"}`,
          `direction:${direction}`,
        ],
      })),
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
