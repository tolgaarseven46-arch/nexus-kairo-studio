import type {
  KairaAutobiographicalMemory,
  KairaIdentitySeed,
  KairaSelfFact,
} from "./kairaIdentityContracts";

export interface KairaCanonicalIdentityState {
  kairaInstanceId: string;
  schemaVersion: 1;
  selfFacts: KairaSelfFact[];
  autobiographicalMemories: KairaAutobiographicalMemory[];
}

export interface KairaCanonicalIdentityIssue {
  invariant: string;
  message: string;
}

const in01 = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

export function canonicalIdentityFromSeed(
  seed: KairaIdentitySeed,
): KairaCanonicalIdentityState {
  return {
    kairaInstanceId: seed.kairaInstanceId,
    schemaVersion: 1,
    selfFacts: seed.selfFacts.map((fact) => ({ ...fact })),
    autobiographicalMemories: seed.inheritedMemories.map((memory) => ({
      ...memory,
      participantIds: [...memory.participantIds],
      facts: [...memory.facts],
      emotions: memory.emotions.map((emotion) => ({ ...emotion })),
    })),
  };
}

export function validateKairaCanonicalIdentity(
  state: KairaCanonicalIdentityState,
): KairaCanonicalIdentityIssue[] {
  const issues: KairaCanonicalIdentityIssue[] = [];
  if (!state.kairaInstanceId.trim()) {
    issues.push({
      invariant: "canonical_identity.instance_required",
      message: "Kaira canonical identity instanceId boş olamaz.",
    });
  }

  const ids = new Set<string>();
  const collectId = (id: string, type: string) => {
    const normalized = id.trim();
    if (!normalized) {
      issues.push({
        invariant: "canonical_identity.record_id_required",
        message: `${type} id boş olamaz.`,
      });
    }
    if (ids.has(normalized)) {
      issues.push({
        invariant: "canonical_identity.record_id_unique",
        message: `Tekrarlanan canonical identity kaydı: ${normalized}`,
      });
    }
    ids.add(normalized);
  };

  for (const fact of state.selfFacts) {
    collectId(fact.id, "self-fact");
    if (fact.canonical !== true) {
      issues.push({
        invariant: "canonical_identity.self_fact_canonical",
        message: `${fact.id} canonical olmalı.`,
      });
    }
    if (!in01(fact.confidence)) {
      issues.push({
        invariant: "canonical_identity.confidence_bounded",
        message: `${fact.id} confidence 0..1 olmalı.`,
      });
    }
  }

  for (const memory of state.autobiographicalMemories) {
    collectId(memory.id, "memory");
    if (memory.canonical !== true) {
      issues.push({
        invariant: "canonical_identity.memory_canonical",
        message: `${memory.id} canonical olmalı.`,
      });
    }
    if (memory.origin !== "inherited" && memory.origin !== "lived") {
      issues.push({
        invariant: "canonical_identity.memory_origin",
        message: `${memory.id} memory origin geçersiz.`,
      });
    }
    if (!in01(memory.salience)) {
      issues.push({
        invariant: "canonical_identity.salience_bounded",
        message: `${memory.id} salience 0..1 olmalı.`,
      });
    }
    if ("narrationText" in memory) {
      issues.push({
        invariant: "canonical_identity.memory_truth_not_prose",
        message: `${memory.id} canonical anı bitmiş anlatım metni taşıyamaz.`,
      });
    }
    for (const emotion of memory.emotions) {
      if (!in01(emotion.intensity)) {
        issues.push({
          invariant: "canonical_identity.emotion_intensity_bounded",
          message: `${memory.id} emotion intensity 0..1 olmalı.`,
        });
      }
    }
  }

  return issues;
}
