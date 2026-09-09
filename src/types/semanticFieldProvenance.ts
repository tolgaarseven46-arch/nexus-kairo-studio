import type { SemanticGroundingField } from "./semanticInterpretation";

export type SemanticEvidenceKind =
  | "morphology"
  | "syntax"
  | "lexical"
  | "mwe"
  | "entity"
  | "discourse"
  | "semantic_provider"
  | "reconciliation";

export interface SemanticFieldEvidenceItem {
  kind: SemanticEvidenceKind;
  provider?: string;
  cues: string[];
  confidence: number;
}

/**
 * L7 sidecar provenance for canonical semantic fields.
 *
 * This is observational metadata, not semantic authority. Semantic truth remains
 * `SemanticInterpretation@2`; this map records why selected fields were accepted
 * or kept uncertain. It is intentionally separate while the contract is being
 * characterized so no schema-version migration is required prematurely.
 */
export type SemanticFieldProvenance = Partial<
  Record<SemanticGroundingField, SemanticFieldEvidenceItem[]>
>;

export function appendSemanticFieldEvidence(
  provenance: SemanticFieldProvenance,
  field: SemanticGroundingField,
  item: SemanticFieldEvidenceItem,
): SemanticFieldProvenance {
  const confidence = Math.max(0, Math.min(1, item.confidence));
  const next = [...(provenance[field] ?? []), { ...item, confidence }].slice(-6);
  return { ...provenance, [field]: next };
}
