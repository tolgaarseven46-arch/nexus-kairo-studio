export type KairaKnowledgeStatus = "known" | "unknown" | "partial";

export interface KairaEpistemicQuery {
  kairaInstanceId: string;
  conceptId?: string;
  entityId?: string;
  surface?: string;
}

export interface KairaEpistemicDecision {
  status: KairaKnowledgeStatus;
  source: "legacy_allow_all" | "species_canon" | "instance_knowledge" | "learned";
  confidence: number;
}

/**
 * Compatibility seam only. Current behavior remains unchanged: every concept is
 * treated as known. Future self/knowledge infrastructure plugs in here instead
 * of scattering knowledge checks across semantic/appraisal/response layers.
 */
export function evaluateKairaKnowledge(
  _query: KairaEpistemicQuery,
): KairaEpistemicDecision {
  return {
    status: "known",
    source: "legacy_allow_all",
    confidence: 1,
  };
}

export function canKairaInterpretAsKnown(query: KairaEpistemicQuery): boolean {
  return evaluateKairaKnowledge(query).status === "known";
}
