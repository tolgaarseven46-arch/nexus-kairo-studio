import type { KairaKnownConcept } from "./kairaIdentityContracts";

export type KairaKnowledgeCoverage = "open_model_fallback" | "bounded_catalog";

export interface KairaKnowledgeProfile {
  kairaInstanceId: string;
  schemaVersion: 1;
  coverage: KairaKnowledgeCoverage;
  concepts: KairaKnownConcept[];
}

export interface KairaKnowledgeProfileIssue {
  invariant: string;
  message: string;
}

const in01 = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

export function validateKairaKnowledgeProfile(
  profile: KairaKnowledgeProfile,
): KairaKnowledgeProfileIssue[] {
  const issues: KairaKnowledgeProfileIssue[] = [];
  if (!profile.kairaInstanceId.trim()) {
    issues.push({
      invariant: "knowledge.instance_required",
      message: "Kaira knowledge profile instanceId boş olamaz.",
    });
  }

  const ids = new Set<string>();
  for (const concept of profile.concepts) {
    const id = concept.id.trim();
    const label = concept.label.trim();
    if (!id || !label) {
      issues.push({
        invariant: "knowledge.concept_identity_required",
        message: "Knowledge concept id ve label boş olamaz.",
      });
    }
    if (ids.has(id)) {
      issues.push({
        invariant: "knowledge.concept_id_unique",
        message: `Tekrarlanan knowledge concept id: ${id}`,
      });
    }
    ids.add(id);
    if (!in01(concept.confidence)) {
      issues.push({
        invariant: "knowledge.confidence_bounded",
        message: `${concept.id} confidence 0..1 olmalı.`,
      });
    }
  }

  return issues;
}

/**
 * Missing concepts mean "unknown" only for bounded_catalog profiles.
 * open_model_fallback explicitly preserves the current broad model-knowledge
 * compatibility behavior until a bounded catalogue is provisioned.
 */
export function isBoundedKnowledgeProfile(
  profile?: KairaKnowledgeProfile | null,
): profile is KairaKnowledgeProfile {
  return Boolean(profile && profile.coverage === "bounded_catalog");
}
