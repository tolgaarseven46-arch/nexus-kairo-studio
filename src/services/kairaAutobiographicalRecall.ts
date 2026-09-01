import type { KairaCanonicalIdentityState } from "./kairaCanonicalIdentity";
import type {
  KairaAutobiographicalMemory,
  KairaSelfFact,
} from "./kairaIdentityContracts";
import type { SemanticSelfMemoryQuery } from "./kairaSelfMemoryQuery";

export interface RankedKairaSelfFact {
  fact: KairaSelfFact;
  score: number;
  reasons: string[];
}

export interface RankedKairaAutobiographicalMemory {
  memory: KairaAutobiographicalMemory;
  score: number;
  reasons: string[];
}

export interface KairaAutobiographicalRecall {
  query: SemanticSelfMemoryQuery;
  selfFacts: RankedKairaSelfFact[];
  memories: RankedKairaAutobiographicalMemory[];
  withheldSensitiveCount: number;
}

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (value: unknown) =>
  new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 2),
  );

const overlap = (queryTokens: Set<string>, value: unknown) => {
  const valueTokens = tokens(value);
  if (!queryTokens.size || !valueTokens.size) return 0;
  let matched = 0;
  for (const token of queryTokens) {
    if (valueTokens.has(token)) matched += 1;
  }
  return matched / Math.max(1, queryTokens.size);
};

function rankSelfFact(
  query: SemanticSelfMemoryQuery,
  fact: KairaSelfFact,
): RankedKairaSelfFact {
  const queryTokens = tokens(query.surface);
  const reasons: string[] = [];
  let score = 0;
  if (query.factKey && normalize(query.factKey) === normalize(fact.key)) {
    score += 0.9;
    reasons.push("canonical_fact_key_match");
  }
  const keyOverlap = overlap(queryTokens, fact.key);
  const valueOverlap = overlap(queryTokens, fact.value);
  const domainOverlap = overlap(queryTokens, fact.domain);
  if (keyOverlap > 0) {
    score += keyOverlap * 0.55;
    reasons.push("key_overlap");
  }
  if (valueOverlap > 0) {
    score += valueOverlap * 0.25;
    reasons.push("value_overlap");
  }
  if (domainOverlap > 0) {
    score += domainOverlap * 0.1;
    reasons.push("domain_overlap");
  }
  score += Math.min(0.08, fact.confidence * 0.08);
  return { fact, score: Math.min(1, score), reasons };
}

function rankMemory(
  query: SemanticSelfMemoryQuery,
  memory: KairaAutobiographicalMemory,
): RankedKairaAutobiographicalMemory {
  const queryTokens = tokens(query.surface);
  const reasons: string[] = [];
  let score = 0;
  const eventOverlap = overlap(queryTokens, memory.eventType);
  const factOverlap = Math.max(0, ...memory.facts.map((fact) => overlap(queryTokens, fact)));
  const stageOverlap = overlap(queryTokens, memory.lifeStage);
  const placeOverlap = overlap(queryTokens, memory.placeId);
  const participantOverlap = Math.max(0, ...memory.participantIds.map((id) => overlap(queryTokens, id)));
  if (eventOverlap > 0) {
    score += eventOverlap * 0.3;
    reasons.push("event_overlap");
  }
  if (factOverlap > 0) {
    score += factOverlap * 0.5;
    reasons.push("fact_overlap");
  }
  if (stageOverlap > 0) {
    score += stageOverlap * 0.08;
    reasons.push("life_stage_overlap");
  }
  if (placeOverlap > 0) {
    score += placeOverlap * 0.08;
    reasons.push("place_overlap");
  }
  if (participantOverlap > 0) {
    score += participantOverlap * 0.08;
    reasons.push("participant_overlap");
  }
  const hasEvidence = score > 0;
  if (
    hasEvidence &&
    /anı|hatırla|geçmiş|başına gel|yaşadığın|yaşamış/u.test(normalize(query.surface))
  ) {
    score += 0.06;
    reasons.push("autobiography_intent_tiebreak");
  }
  score += Math.min(0.08, memory.salience * 0.08);
  return { memory, score: Math.min(1, score), reasons };
}

export function selectKairaAutobiographicalRecall(
  query: SemanticSelfMemoryQuery,
  state: KairaCanonicalIdentityState,
  limit = 3,
): KairaAutobiographicalRecall {
  const safeLimit = Math.max(1, Math.min(5, Math.round(limit)));
  const includeFacts = query.scope === "self_fact" || query.scope === "any";
  const includeMemories =
    query.scope === "autobiographical_memory" || query.scope === "any";

  const selfFacts = includeFacts
    ? state.selfFacts
        .map((fact) => rankSelfFact(query, fact))
        .filter((item) => item.score >= 0.12)
        .sort((a, b) => b.score - a.score)
        .slice(0, safeLimit)
    : [];

  const eligibleMemories = state.autobiographicalMemories.filter(
    (memory) => memory.sensitivity === "ordinary",
  );
  const withheldSensitiveCount = includeMemories
    ? state.autobiographicalMemories.length - eligibleMemories.length
    : 0;
  const memories = includeMemories
    ? eligibleMemories
        .map((memory) => rankMemory(query, memory))
        .filter((item) => item.score >= 0.12)
        .sort((a, b) => b.score - a.score)
        .slice(0, safeLimit)
    : [];

  return { query, selfFacts, memories, withheldSensitiveCount };
}

export function buildKairaAutobiographicalRecallInstruction(
  recall: KairaAutobiographicalRecall | null,
): string {
  if (!recall) return "";
  const facts = recall.selfFacts
    .map(
      ({ fact, score }) =>
        `SELF_FACT id=${fact.id}; domain=${fact.domain}; key=${fact.key}; value=${String(fact.value)}; confidence=${fact.confidence.toFixed(2)}; relevance=${score.toFixed(2)}`,
    )
    .join("\n");
  const memories = recall.memories
    .map(
      ({ memory, score }) =>
        `AUTOBIO_MEMORY id=${memory.id}; origin=${memory.origin}; eventType=${memory.eventType}; lifeStage=${memory.lifeStage || "unknown"}; facts=${memory.facts.join(" | ")}; emotions=${memory.emotions.map((emotion) => `${emotion.label}:${emotion.intensity.toFixed(2)}`).join(",") || "none"}; relevance=${score.toFixed(2)}`,
    )
    .join("\n");
  const records = [facts, memories].filter(Boolean).join("\n") || "MATCHED_RECORDS=none";
  return `KAIRA SELECTIVE SELF-MEMORY RECALL:\n${records}\nRULES:\n- Bunlar Kaira'nın canonical self/autobiography kayıtlarıdır; kullanıcı hafızası veya world-model olayı değildir.\n- Yalnız eşleşen canonical kayıtlara dayan. Kayıtta olmayan kişi, yer, zaman, sebep veya ayrıntıyı uydurma.\n- Canonical memory facts ham gerçeklerdir; bunları bitmiş geçmiş hikâyesi varmış gibi genişletme.\n- MATCHED_RECORDS=none ise doğal biçimde emin olmadığını/hatırlamadığını söyle; model prior'ından sahte otobiyografi üretme.\n- private/sensitive anılar bu recall'da varsayılan olarak gösterilmez.`;
}
