import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  rankWorldEventObservations,
  shouldRetrieveWorldEvents,
  type RetrievedWorldEvent,
} from "./worldEventRetrieval";
import {
  isPlanRecallQuery,
  rankPlanRecallObservations,
} from "./worldEventPlanRecallPolicy";
import {
  isPlanOutcomeRecallQuery,
  resolvePlanOutcomeRecall,
} from "./worldEventOutcomeRecallPolicy";
import type { PlanLifecycleResolution } from "./worldEventLifecycle";
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
import {
  retrievePropositionTemporalEventNeighbors,
  type PropositionTemporalAnchorResolution,
} from "./propositionTemporalEventAnchorResolver";

export type WorldEventRetrievalMode = "none" | "ranked_recall" | "plan_recall" | "plan_outcome" | "temporal_graph";

export interface CoordinatedWorldEventRetrieval {
  mode: WorldEventRetrievalMode;
  items: RetrievedWorldEvent[];
  discourseResolution?: DiscourseTemporalAnchorResolution;
  explicitAnchorResolution?: ExplicitTemporalAnchorResolution;
  propositionAnchorResolution?: PropositionTemporalAnchorResolution;
  planLifecycleResolution?: PlanLifecycleResolution;
}

type RetrievalSemantics = Pick<SemanticInterpretation, "discourseFacets">;

export function shouldCoordinateWorldEventRetrieval(
  interpretation: RetrievalSemantics,
): boolean {
  return shouldRetrieveWorldEvents(interpretation);
}

function graphItems(
  observations: WorldEventObservation[],
  anchorObservationId: string | undefined,
  direction: "before" | "after" | undefined,
  maxItems: number,
  reasonPrefix: "proposition_anchor" | "explicit_anchor" | "discourse_anchor",
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

function lifecycleItems(
  observations: WorldEventObservation[],
  resolution: PlanLifecycleResolution | undefined,
  maxItems: number,
): RetrievedWorldEvent[] {
  if (!resolution) return [];
  const ids = new Set(resolution.evidenceObservationIds);
  return observations
    .filter((item) => Boolean(item.id && ids.has(item.id)))
    .slice(0, maxItems)
    .map((observation) => ({
      observation,
      score: 100,
      reasons: [
        "plan_lifecycle_evidence",
        `lifecycle_state:${resolution.state}`,
        `proposition:${resolution.propositionKey || "unresolved"}`,
      ],
    }));
}

/**
 * Single policy seam for world-model retrieval. Canonical language understanding
 * authorizes recall once; raw message text may only choose the retrieval mode
 * and rank evidence after that authorization.
 *
 * Temporal event questions are graph-only. Full proposition anchors have highest
 * priority, followed by the coarser named/event anchor, then conservative discourse
 * resolution. Plan outcome recall is lifecycle-only and never falls back to lexical
 * guessing.
 */
export function coordinateWorldEventRetrieval(input: {
  message: string;
  interpretation: RetrievalSemantics;
  sessionId: string;
  observations: WorldEventObservation[];
  maxItems?: number;
  queryAnchorAt?: string;
}): CoordinatedWorldEventRetrieval {
  if (!shouldRetrieveWorldEvents(input.interpretation)) {
    return { mode: "none", items: [] };
  }

  const maxItems = Math.max(1, Math.min(input.maxItems ?? 5, 10));
  const explicitDirection = detectExplicitTemporalRelationDirection(input.message);
  if (explicitDirection) {
    const propositionResult = retrievePropositionTemporalEventNeighbors({
      message: input.message,
      sessionId: input.sessionId,
      observations: input.observations,
    });
    if (propositionResult.resolution.reason !== "no_proposition_anchor") {
      return {
        mode: "temporal_graph",
        propositionAnchorResolution: propositionResult.resolution,
        items: graphItems(
          propositionResult.observations,
          propositionResult.resolution.anchorObservationId,
          propositionResult.resolution.direction,
          maxItems,
          "proposition_anchor",
        ),
      };
    }

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

  if (isPlanOutcomeRecallQuery(input.message)) {
    const outcome = resolvePlanOutcomeRecall({
      message: input.message,
      observations: input.observations,
    });
    return {
      mode: "plan_outcome",
      ...(outcome.resolution ? { planLifecycleResolution: outcome.resolution } : {}),
      items: lifecycleItems(input.observations, outcome.resolution, maxItems),
    };
  }

  if (isPlanRecallQuery(input.message)) {
    return {
      mode: "plan_recall",
      items: rankPlanRecallObservations({
        message: input.message,
        observations: input.observations,
        maxItems,
      }),
    };
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
