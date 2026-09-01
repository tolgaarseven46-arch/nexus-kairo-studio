import type { KairaSelfRevisionEvidence } from "./kairaSelfRevisionEvidence";

export type KairaKnowledgeProvenance = "species_canon" | "inherited" | "learned";
export type KairaSelfFactDomain = "preference" | "belief" | "trait" | "biography";
export type KairaMemorySensitivity = "ordinary" | "private" | "sensitive";
export type KairaMemoryOrigin = "inherited" | "lived";

export interface KairaKnownConcept {
  id: string;
  label: string;
  provenance: KairaKnowledgeProvenance;
  learnedFromUserId?: string;
  learnedAt?: string;
  confidence: number;
}

export interface KairaSelfFact {
  id: string;
  domain: KairaSelfFactDomain;
  key: string;
  value: string | number | boolean;
  canonical: true;
  confidence: number;
  source: "identity_seed" | "lived_revision";
}

export interface KairaAutobiographicalMemory {
  id: string;
  origin: KairaMemoryOrigin;
  occurredAt?: string;
  lifeStage?: string;
  participantIds: string[];
  placeId?: string;
  eventType: string;
  facts: string[];
  emotions: Array<{ label: string; intensity: number }>;
  salience: number;
  sensitivity: KairaMemorySensitivity;
  canonical: true;
  /**
   * Lived memories retain provenance to the canonical world observation that
   * caused consolidation. The autobiography stores Kaira's lived projection,
   * not a second copy of the world-model record.
   */
  sourceWorldObservationIds?: string[];
  /** Stable idempotency key for consolidation of one lived episode. */
  consolidationKey?: string;
  /**
   * Optional typed evidence that a higher-level appraisal explicitly derived
   * from this lived episode. Memory eventType/facts are never re-parsed here to
   * invent self-model changes.
   */
  selfRevisionEvidence?: KairaSelfRevisionEvidence;
  /** Canonical memory stores facts, never a finished prose story. */
  narrationText?: never;
}

export interface KairaIdentitySeed {
  kairaInstanceId: string;
  schemaVersion: 1;
  selfFacts: KairaSelfFact[];
  knownConcepts: KairaKnownConcept[];
  inheritedMemories: KairaAutobiographicalMemory[];
  isTestFixture?: boolean;
}

export interface KairaIdentityIssue {
  invariant: string;
  message: string;
}

const in01 = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

export function validateKairaIdentitySeed(seed: KairaIdentitySeed): KairaIdentityIssue[] {
  const issues: KairaIdentityIssue[] = [];
  if (!seed.kairaInstanceId.trim()) {
    issues.push({ invariant: "identity.instance_required", message: "Kaira instanceId boş olamaz." });
  }

  const ids = new Set<string>();
  const collectId = (id: string, type: string) => {
    if (!id.trim()) issues.push({ invariant: "identity.record_id_required", message: `${type} id boş olamaz.` });
    if (ids.has(id)) issues.push({ invariant: "identity.record_id_unique", message: `Tekrarlanan identity kaydı: ${id}` });
    ids.add(id);
  };

  for (const fact of seed.selfFacts) {
    collectId(fact.id, "self-fact");
    if (!fact.canonical) issues.push({ invariant: "identity.self_fact_canonical", message: `${fact.id} canonical olmalı.` });
    if (!in01(fact.confidence)) issues.push({ invariant: "identity.confidence_bounded", message: `${fact.id} confidence 0..1 olmalı.` });
  }
  for (const concept of seed.knownConcepts) {
    collectId(concept.id, "known-concept");
    if (!in01(concept.confidence)) issues.push({ invariant: "identity.confidence_bounded", message: `${concept.id} confidence 0..1 olmalı.` });
  }
  for (const memory of seed.inheritedMemories) {
    collectId(memory.id, "memory");
    if (memory.origin !== "inherited") issues.push({ invariant: "identity.seed_memory_inherited", message: `${memory.id} seed içinde inherited olmalı.` });
    if (!in01(memory.salience)) issues.push({ invariant: "identity.salience_bounded", message: `${memory.id} salience 0..1 olmalı.` });
    if ("narrationText" in memory) issues.push({ invariant: "identity.memory_truth_not_prose", message: `${memory.id} canonical anı bitmiş anlatım metni taşıyamaz.` });
    if (memory.selfRevisionEvidence) issues.push({ invariant: "identity.seed_memory_no_lived_revision_evidence", message: `${memory.id} inherited seed memory lived revision evidence taşıyamaz.` });
  }
  return issues;
}

/**
 * Temporary engineering fixture only. It exercises identity/knowledge/memory
 * mechanics without turning placeholder lore into production canon.
 */
export function buildKairaIdentityTestFixture(kairaInstanceId = "kaira_fixture_001"): KairaIdentitySeed {
  return {
    kairaInstanceId,
    schemaVersion: 1,
    isTestFixture: true,
    selfFacts: [
      { id: "sf_flower", domain: "preference", key: "favorite_flower", value: "krizantem", canonical: true, confidence: 1, source: "identity_seed" },
      { id: "sf_color", domain: "preference", key: "preferred_clothing_color", value: "kırmızı", canonical: true, confidence: 1, source: "identity_seed" },
    ],
    knownConcepts: [
      { id: "concept_krizantem", label: "krizantem", provenance: "inherited", confidence: 1 },
      { id: "concept_test_shelter", label: "sığınak", provenance: "inherited", confidence: 0.9 },
    ],
    inheritedMemories: [
      {
        id: "mem_fixture_storm",
        origin: "inherited",
        lifeStage: "erken dönem",
        participantIds: ["fixture_friend_01"],
        eventType: "storm_shelter",
        facts: ["şiddetli yağmura yakalandılar", "bir sığınak buldular", "olayı sonradan komik hatırlıyor"],
        emotions: [
          { label: "kaygı", intensity: 0.55 },
          { label: "eğlence", intensity: 0.7 },
        ],
        salience: 0.72,
        sensitivity: "ordinary",
        canonical: true,
      },
    ],
  };
}
