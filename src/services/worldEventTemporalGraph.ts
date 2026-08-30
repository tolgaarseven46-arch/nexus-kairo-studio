import type { WorldEventObservation } from "./worldModelEventStore";

export type TemporalGraphRelation = "before" | "after";
export type TemporalNeighborDirection = "before" | "after";

export interface TemporalGraphEdge {
  sourceObservationId: string;
  targetObservationId: string;
  relation: TemporalGraphRelation;
  sessionId: string;
  provenance: "temporal_reference_observation";
}

export interface TemporalGraphIssue {
  invariant:
    | "temporal_graph.self_reference"
    | "temporal_graph.missing_reference"
    | "temporal_graph.cross_session_reference"
    | "temporal_graph.interval_order";
  observationId?: string;
  referenceObservationId?: string;
  message: string;
}

export interface TemporalEventGraph {
  edges: TemporalGraphEdge[];
  issues: TemporalGraphIssue[];
}

const validTime = (value?: string) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Builds a graph only from persisted provenance. It never infers what "ondan"
 * refers to and therefore cannot invent an event link that was not resolved at
 * persistence time.
 */
export function buildTemporalEventGraph(
  observations: WorldEventObservation[],
): TemporalEventGraph {
  const byId = new Map(
    observations
      .filter((item): item is WorldEventObservation & { id: string } => Boolean(item.id))
      .map((item) => [item.id, item]),
  );
  const edges: TemporalGraphEdge[] = [];
  const issues: TemporalGraphIssue[] = [];

  for (const observation of observations) {
    const observationId = observation.id;
    const referenceId = observation.temporalReferenceObservationId;
    if (!observationId || !referenceId) continue;

    if (observationId === referenceId) {
      issues.push({
        invariant: "temporal_graph.self_reference",
        observationId,
        referenceObservationId: referenceId,
        message: "Temporal event kendisine referans veremez.",
      });
      continue;
    }

    const reference = byId.get(referenceId);
    if (!reference) {
      issues.push({
        invariant: "temporal_graph.missing_reference",
        observationId,
        referenceObservationId: referenceId,
        message: "Temporal provenance mevcut observation kümesinde bulunamıyor.",
      });
      continue;
    }

    if (reference.sessionId !== observation.sessionId) {
      issues.push({
        invariant: "temporal_graph.cross_session_reference",
        observationId,
        referenceObservationId: referenceId,
        message: "Temporal event bağı farklı session'lar arasında kurulamaz.",
      });
      continue;
    }

    const direction = observation.event.temporal?.dependency?.direction;
    if (!direction) continue;

    const edge: TemporalGraphEdge = direction === "after"
      ? {
          sourceObservationId: referenceId,
          targetObservationId: observationId,
          relation: "before",
          sessionId: observation.sessionId,
          provenance: "temporal_reference_observation",
        }
      : {
          sourceObservationId: observationId,
          targetObservationId: referenceId,
          relation: "before",
          sessionId: observation.sessionId,
          provenance: "temporal_reference_observation",
        };

    const source = byId.get(edge.sourceObservationId);
    const target = byId.get(edge.targetObservationId);
    const sourceEnd = validTime(source?.event.temporal?.resolved?.endAt);
    const targetStart = validTime(target?.event.temporal?.resolved?.startAt);
    if (
      sourceEnd !== undefined &&
      targetStart !== undefined &&
      sourceEnd > targetStart
    ) {
      issues.push({
        invariant: "temporal_graph.interval_order",
        observationId,
        referenceObservationId: referenceId,
        message: "Resolved temporal interval, persisted before/after ilişkisiyle çelişiyor.",
      });
      continue;
    }

    edges.push(edge);
  }

  return { edges, issues };
}

export function observationsAfter(
  graph: TemporalEventGraph,
  anchorObservationId: string,
): string[] {
  return graph.edges
    .filter(
      (edge) =>
        edge.relation === "before" &&
        edge.sourceObservationId === anchorObservationId,
    )
    .map((edge) => edge.targetObservationId);
}

export function observationsBefore(
  graph: TemporalEventGraph,
  anchorObservationId: string,
): string[] {
  return graph.edges
    .filter(
      (edge) =>
        edge.relation === "before" &&
        edge.targetObservationId === anchorObservationId,
    )
    .map((edge) => edge.sourceObservationId);
}

/**
 * Retrieval seam for event-chain queries. The caller must supply an explicit
 * anchor observation id that was resolved by a higher discourse/context layer.
 * No "latest event" or lexical guess is performed here.
 */
export function retrieveTemporalNeighbors(
  observations: WorldEventObservation[],
  anchorObservationId: string | undefined,
  direction: TemporalNeighborDirection,
): WorldEventObservation[] {
  if (!anchorObservationId) return [];
  const graph = buildTemporalEventGraph(observations);
  if (graph.issues.length) return [];

  const neighborIds = direction === "after"
    ? observationsAfter(graph, anchorObservationId)
    : observationsBefore(graph, anchorObservationId);
  if (!neighborIds.length) return [];

  const byId = new Map(
    observations
      .filter((item): item is WorldEventObservation & { id: string } => Boolean(item.id))
      .map((item) => [item.id, item]),
  );

  return neighborIds
    .map((id) => byId.get(id))
    .filter((item): item is WorldEventObservation => Boolean(item));
}
