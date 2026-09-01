import type {
  KairaAutobiographicalMemory,
  KairaSelfFact,
} from "./kairaIdentityContracts";
import type { KairaCanonicalIdentityState } from "./kairaCanonicalIdentity";
import { normalizeKairaSelfRevisionEvidence } from "./kairaSelfRevisionEvidence";

export type KairaSelfFactRevisionStatus =
  | "revised"
  | "reinforced"
  | "no_evidence"
  | "insufficient_evidence"
  | "conflicted_evidence"
  | "domain_mismatch";

export interface KairaSelfFactRevisionDecision {
  status: KairaSelfFactRevisionStatus;
  factKey: string;
  fact: KairaSelfFact | null;
  evidenceMemoryIds: string[];
  supportCount: number;
  competingCount: number;
  confidence: number;
}

const valueKey = (value: string | number | boolean) =>
  `${typeof value}:${typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : String(value)}`;

const factId = (factKey: string) =>
  `sf_lived_${factKey.replace(/[^a-z0-9_:-]+/gi, "_").slice(0, 80)}`;

function evidenceRows(state: KairaCanonicalIdentityState, factKey: string) {
  const seenSources = new Set<string>();
  const rows: Array<{
    memory: KairaAutobiographicalMemory;
    evidence: NonNullable<ReturnType<typeof normalizeKairaSelfRevisionEvidence>>;
  }> = [];

  for (const memory of state.autobiographicalMemories) {
    if (memory.origin !== "lived") continue;
    const evidence = normalizeKairaSelfRevisionEvidence(memory.selfRevisionEvidence);
    if (!evidence || evidence.factKey !== factKey) continue;
    const sourceKey = (memory.sourceWorldObservationIds || []).slice().sort().join("|") || memory.id;
    if (seenSources.has(sourceKey)) continue;
    seenSources.add(sourceKey);
    rows.push({ memory, evidence });
  }
  return rows;
}

export function evaluateKairaSelfFactRevision(
  state: KairaCanonicalIdentityState,
  factKey: string,
): KairaSelfFactRevisionDecision {
  const key = String(factKey || "").trim().toLocaleLowerCase("en-US");
  const rows = evidenceRows(state, key);
  if (!rows.length) {
    return { status: "no_evidence", factKey: key, fact: null, evidenceMemoryIds: [], supportCount: 0, competingCount: 0, confidence: 0 };
  }

  const current = state.selfFacts.find((fact) => fact.key.toLocaleLowerCase("en-US") === key);
  const domains = new Set(rows.map((row) => row.evidence.domain));
  if (domains.size !== 1 || (current && !domains.has(current.domain as "preference" | "belief"))) {
    return {
      status: "domain_mismatch",
      factKey: key,
      fact: null,
      evidenceMemoryIds: rows.map((row) => row.memory.id),
      supportCount: 0,
      competingCount: rows.length,
      confidence: 0,
    };
  }

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const groupKey = `${row.evidence.domain}|${valueKey(row.evidence.value)}`;
    const group = groups.get(groupKey) ?? [];
    group.push(row);
    groups.set(groupKey, group);
  }
  const ranked = [...groups.values()].sort((a, b) => {
    const avgA = a.reduce((sum, row) => sum + row.evidence.confidence, 0) / a.length;
    const avgB = b.reduce((sum, row) => sum + row.evidence.confidence, 0) / b.length;
    return b.length - a.length || avgB - avgA;
  });
  const winner = ranked[0] ?? [];
  const supportCount = winner.length;
  const competingCount = rows.length - supportCount;
  const supportRatio = supportCount / Math.max(1, rows.length);
  const averageConfidence = winner.reduce((sum, row) => sum + row.evidence.confidence, 0) / Math.max(1, supportCount);
  const winningEvidence = winner[0]?.evidence;
  if (!winningEvidence) {
    return { status: "no_evidence", factKey: key, fact: null, evidenceMemoryIds: [], supportCount: 0, competingCount: 0, confidence: 0 };
  }
  const changingSeed = Boolean(
    current &&
      current.source === "identity_seed" &&
      valueKey(current.value) !== valueKey(winningEvidence.value),
  );
  const minEvidence = changingSeed ? 4 : 3;
  const minRatio = changingSeed ? 0.8 : 0.75;
  const minConfidence = changingSeed ? 0.85 : 0.78;

  if (supportCount < minEvidence || averageConfidence < minConfidence) {
    return {
      status: "insufficient_evidence",
      factKey: key,
      fact: null,
      evidenceMemoryIds: winner.map((row) => row.memory.id),
      supportCount,
      competingCount,
      confidence: averageConfidence,
    };
  }
  if (supportRatio < minRatio) {
    return {
      status: "conflicted_evidence",
      factKey: key,
      fact: null,
      evidenceMemoryIds: winner.map((row) => row.memory.id),
      supportCount,
      competingCount,
      confidence: averageConfidence * supportRatio,
    };
  }

  const confidence = Math.max(0, Math.min(1, averageConfidence * supportRatio));
  if (current && valueKey(current.value) === valueKey(winningEvidence.value)) {
    return {
      status: "reinforced",
      factKey: key,
      fact: { ...current, confidence: Math.max(current.confidence, confidence) },
      evidenceMemoryIds: winner.map((row) => row.memory.id),
      supportCount,
      competingCount,
      confidence,
    };
  }

  return {
    status: "revised",
    factKey: key,
    fact: {
      id: current?.id || factId(key),
      domain: winningEvidence.domain,
      key,
      value: winningEvidence.value,
      canonical: true,
      confidence,
      source: "lived_revision",
    },
    evidenceMemoryIds: winner.map((row) => row.memory.id),
    supportCount,
    competingCount,
    confidence,
  };
}

export function applyKairaSelfFactRevisionDecision(
  state: KairaCanonicalIdentityState,
  decision: KairaSelfFactRevisionDecision,
): KairaCanonicalIdentityState {
  if ((decision.status !== "revised" && decision.status !== "reinforced") || !decision.fact) return state;
  const index = state.selfFacts.findIndex(
    (fact) => fact.key.toLocaleLowerCase("en-US") === decision.factKey,
  );
  const selfFacts = state.selfFacts.map((fact) => ({ ...fact }));
  if (index >= 0) selfFacts[index] = { ...decision.fact };
  else selfFacts.push({ ...decision.fact });
  return { ...state, selfFacts };
}
