import type { KairaKnowledgeProfile } from "./kairaKnowledgeProfile";

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

const normalize = (value?: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");

function conceptSource(
  provenance: "species_canon" | "inherited" | "learned",
): KairaEpistemicDecision["source"] {
  if (provenance === "species_canon") return "species_canon";
  if (provenance === "learned") return "learned";
  return "instance_knowledge";
}

/**
 * Canonical epistemic seam.
 *
 * Absence can mean UNKNOWN only when the supplied profile explicitly declares
 * itself a complete bounded catalogue. Open/absent profiles preserve the
 * legacy broad-model compatibility behavior; callers must never infer
 * ignorance merely because one concept was not listed in a partial profile.
 */
export function evaluateKairaKnowledge(
  query: KairaEpistemicQuery,
  profile?: KairaKnowledgeProfile | null,
): KairaEpistemicDecision {
  const conceptId = normalize(query.conceptId);
  const surface = normalize(query.surface);
  const profileMatchesInstance =
    profile?.kairaInstanceId.trim() === query.kairaInstanceId.trim();

  if (profile && profileMatchesInstance) {
    const matched = profile.concepts.find((concept) => {
      const candidateId = normalize(concept.id);
      const candidateLabel = normalize(concept.label);
      return Boolean(
        (conceptId && candidateId === conceptId) ||
          (surface && (candidateLabel === surface || candidateId === surface)),
      );
    });

    if (matched) {
      return {
        status: matched.confidence >= 0.72 ? "known" : "partial",
        source: conceptSource(matched.provenance),
        confidence: Math.max(0, Math.min(1, matched.confidence)),
      };
    }

    if (profile.coverage === "bounded_catalog" && (conceptId || surface)) {
      return {
        status: "unknown",
        source: "instance_knowledge",
        confidence: 1,
      };
    }
  }

  return {
    status: "known",
    source: "legacy_allow_all",
    confidence: 1,
  };
}

export function canKairaInterpretAsKnown(
  query: KairaEpistemicQuery,
  profile?: KairaKnowledgeProfile | null,
): boolean {
  return evaluateKairaKnowledge(query, profile).status === "known";
}
