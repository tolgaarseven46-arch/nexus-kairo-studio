import type { SemanticInterpretation, SemanticWorldMemoryQuery } from "../types/semanticInterpretation";
import {
  observationKairaInstanceId,
  type WorldEventObservation,
} from "./worldModelEventStore";
import { compareObservationRecency } from "./temporalEvidencePolicy";
import {
  observationPropositionKey,
  resolveContradictionEvidence,
} from "./worldEventContradictionResolver";
import {
  projectWorldModel,
  type WorldModelPropositionState,
} from "./worldModelProjection";
import { detectWorldEventTemporalReference } from "./worldEventEngine";
import { resolveTemporalReference } from "./temporalReferenceResolver";
import {
  detectTemporalDiscourseDirection,
  retrieveTemporalDiscourseNeighbors,
} from "./discourseTemporalAnchorResolver";

export interface RetrievedWorldEvent {
  observation: WorldEventObservation;
  score: number;
  reasons: string[];
  /**
   * Optional canonical state computed before retrieval truncation. Current-state
   * recall carries this so response generation never rebuilds truth from only
   * the top-N evidence subset.
   */
  projectedState?: WorldModelPropositionState;
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const tokens = (value: string) =>
  normalize(value).split(/[^\p{L}\p{N}_]+/u).filter((token) => token.length >= 2);

const memoryKey = (value: string) => value.toLocaleLowerCase("en-US").trim();
function matchingMemoryFacts(observation: WorldEventObservation, query: SemanticWorldMemoryQuery) {
  return (observation.event.memoryFacts ?? []).filter((fact) =>
    fact.confidence >= 0.72 &&
    memoryKey(fact.subjectId) === memoryKey(query.subjectId) &&
    memoryKey(fact.attributeKey) === memoryKey(query.attributeKey)
  );
}

const REPORTED_SPEECH_RE = /\b(?:ne demişti|ne dedi|demişti|dedi|söylemişti|söyledi)\b/iu;
const STORED_QUERY_RE = /[?？]\s*$|\b(?:ne demişti|ne dedi|ne olmuştu|ne oldu|hatırlıyor musun|hatırladın mı|hakkında ne biliyorsun)\b|\b(?:mi|mı|mu|mü)\b.*\b(?:demişti|dedi|söylemişti|söyledi)\b/iu;
const LATEST_RECALL_RE = /\ben\s+son\b/iu;
const CURRENT_STATE_RE = /\b(?:şu\s+an|şimdiki|şimdi\s+durum|durum\s+ne|hâlâ|hala|hakkında\s+ne\s+biliyorsun)\b/iu;

/**
 * World-event retrieval is an authority decision, not a lexical inference.
 * Canonical language understanding decides once whether the turn is a recall
 * request; this seam must never reopen that decision from raw user text.
 */
export function shouldRetrieveWorldEvents(
  interpretation: Pick<SemanticInterpretation, "discourseFacets">,
): boolean {
  return interpretation.discourseFacets.discourseAct === "recall_request";
}

function observationSignature(item: RetrievedWorldEvent): string {
  const event = item.observation.event;
  return [
    normalize(event.raw || ""),
    normalize(event.actor?.name || event.actor?.id || ""),
    normalize(event.target?.name || event.target?.id || ""),
    item.observation.kind,
    item.observation.status,
  ].join("|");
}

function projectionKey(observation: WorldEventObservation): string {
  return `${observationKairaInstanceId(observation)}::${observationPropositionKey(observation)}`;
}

function intervalsOverlap(
  a: { startAt: string; endAt: string },
  b: { startAt: string; endAt: string },
): boolean {
  const aStart = Date.parse(a.startAt);
  const aEnd = Date.parse(a.endAt);
  const bStart = Date.parse(b.startAt);
  const bEnd = Date.parse(b.endAt);
  return [aStart, aEnd, bStart, bEnd].every(Number.isFinite) && aStart <= bEnd && bStart <= aEnd;
}

function temporalQueryCandidates(
  message: string,
  observations: WorldEventObservation[],
  queryAnchorAt: string,
): { observations: WorldEventObservation[]; temporalMatched: Set<WorldEventObservation> } {
  const queryInterval = resolveTemporalReference(
    message,
    detectWorldEventTemporalReference(message),
    queryAnchorAt,
  );
  if (!queryInterval) return { observations, temporalMatched: new Set() };

  const resolvable = observations.filter((item) => item.event.temporal?.resolved);
  if (!resolvable.length) return { observations, temporalMatched: new Set() };

  const matching = resolvable.filter((item) =>
    intervalsOverlap(queryInterval, item.event.temporal!.resolved!),
  );
  if (!matching.length) return { observations, temporalMatched: new Set() };
  return { observations: matching, temporalMatched: new Set(matching) };
}

function temporalDiscourseResults(
  message: string,
  observations: WorldEventObservation[],
  maxItems: number,
): RetrievedWorldEvent[] | undefined {
  const direction = detectTemporalDiscourseDirection(message);
  if (!direction) return undefined;

  const sessionIds = Array.from(
    new Set(observations.map((item) => item.sessionId).filter(Boolean)),
  );
  // The current server call historically did not pass sessionId into this seam.
  // We therefore allow implicit discourse resolution only when the loaded
  // evidence is already single-session. Multiple sessions => no guess.
  if (sessionIds.length !== 1) return [];

  const result = retrieveTemporalDiscourseNeighbors({
    message,
    sessionId: sessionIds[0],
    observations,
  });
  if (result.resolution.status !== "resolved") return [];

  const limit = Math.max(1, Math.min(maxItems, 10));
  return result.observations.slice(0, limit).map((observation) => ({
    observation,
    score: 100,
    reasons: [
      "temporal_graph_neighbor",
      `discourse_anchor:${result.resolution.anchorObservationId || "unresolved"}`,
      `direction:${direction}`,
    ],
  }));
}

export function rankWorldEventObservations(
  message: string,
  observations: WorldEventObservation[],
  maxItems = 5,
  queryAnchorAt = new Date().toISOString(),
  memoryQuery?: SemanticWorldMemoryQuery | null,
): RetrievedWorldEvent[] {
  const discourseResults = temporalDiscourseResults(message, observations, maxItems);
  if (discourseResults !== undefined) return discourseResults;

  const normalizedMessage = normalize(message);
  const queryTokens = new Set(tokens(message));
  const asksReportedSpeech = REPORTED_SPEECH_RE.test(normalizedMessage);
  const asksLatest = LATEST_RECALL_RE.test(normalizedMessage);
  const asksCurrentState = CURRENT_STATE_RE.test(normalizedMessage);
  const temporalCandidates = temporalQueryCandidates(message, observations, queryAnchorAt);
  const canonicalMemoryQuery = memoryQuery && memoryQuery.confidence >= 0.72 ? memoryQuery : null;
  const projection = asksCurrentState ? projectWorldModel(temporalCandidates.observations) : [];
  const projectionByKey = new Map(
    projection.map((state) => [
      `${state.kairaInstanceId}::${state.propositionKey}`,
      state,
    ]),
  );

  const ranked = temporalCandidates.observations
    .filter((observation) => !STORED_QUERY_RE.test(normalize(observation.event.raw || "")))
    .filter((observation) => !canonicalMemoryQuery || matchingMemoryFacts(observation, canonicalMemoryQuery).length > 0)
    .map((observation) => {
      const reasons: string[] = [];
      let score = 0;
      const event = observation.event;
      const projectedState = asksCurrentState
        ? projectionByKey.get(projectionKey(observation))
        : undefined;
      const structuredFactMatches = canonicalMemoryQuery ? matchingMemoryFacts(observation, canonicalMemoryQuery) : [];
      if (structuredFactMatches.length) {
        score += 8;
        reasons.push(`memory_fact:${canonicalMemoryQuery!.subjectId}:${canonicalMemoryQuery!.attributeKey}`);
      }
      const names = [event.actor?.name, event.target?.name, observation.speakerName]
        .filter((value): value is string => Boolean(value))
        .map(normalize);

      for (const name of names) {
        if (queryTokens.has(name)) {
          score += 5;
          reasons.push(`name:${name}`);
        }
      }

      const rawTokens = new Set(tokens(event.raw || ""));
      let overlap = 0;
      for (const token of queryTokens) {
        if (rawTokens.has(token)) overlap += 1;
      }
      if (overlap) {
        score += Math.min(3, overlap);
        reasons.push(`token_overlap:${overlap}`);
      }

      if (temporalCandidates.temporalMatched.has(observation)) {
        score += 4;
        reasons.push("temporal_interval_match");
      }

      if (asksReportedSpeech && observation.kind === "reported_claim") {
        score += 1.5;
        reasons.push("reported_speech_match");
      }

      if (observation.kind === "direct_interaction") {
        score += 1.25;
        reasons.push("direct_interaction");
      }
      if (observation.status === "grounded") {
        score += 1.5;
        reasons.push("grounded");
      } else {
        score -= 0.75;
        reasons.push("ambiguous");
      }
      score += Math.max(0, Math.min(1, event.certainty ?? 0));

      if (asksCurrentState) {
        if (projectedState?.evidenceStatus === "conflicting") {
          // Current-state queries must keep both sides of a real contradiction
          // visible instead of picking the newest row as synthetic truth.
          score += 4;
          reasons.push("canonical_conflict_evidence");
        } else if (observation.id && projectedState?.latestEvidenceId === observation.id) {
          // For current-state recall the canonical read-model outranks lexical
          // overlap from stale observations, while historical recall remains
          // evidence-first and unchanged.
          score += 5;
          reasons.push(`canonical_current_state:${projectedState.assertionState}`);
        }
        if (
          projectedState?.lifecycle.state !== "unknown" &&
          observation.id &&
          projectedState?.lifecycle.evidenceObservationIds.includes(observation.id)
        ) {
          score += 2;
          reasons.push(`canonical_lifecycle:${projectedState.lifecycle.state}`);
        }
      }

      return { observation, score, reasons, projectedState };
    });

  const aboveThreshold = ranked.filter((item) => item.score >= 2);
  const matchedQueryNames = new Set<string>();
  for (const item of aboveThreshold) {
    for (const reason of item.reasons) {
      if (reason.startsWith("name:")) matchedQueryNames.add(reason.slice(5));
    }
  }

  const relevant = matchedQueryNames.size
    ? aboveThreshold.filter((item) => item.reasons.some((reason) => reason.startsWith("name:")))
    : aboveThreshold;

  const sorted = relevant.sort((a, b) => {
    if (asksLatest) {
      const temporal = compareObservationRecency(a.observation, b.observation);
      if (temporal !== 0) return temporal;
    }
    if (b.score !== a.score) return b.score - a.score;
    return compareObservationRecency(a.observation, b.observation);
  });

  const deduped: RetrievedWorldEvent[] = [];
  const seen = new Set<string>();
  for (const item of sorted) {
    const signature = observationSignature(item);
    if (seen.has(signature)) continue;
    seen.add(signature);
    deduped.push(item);
  }

  const limit = Math.max(1, Math.min(maxItems, 10));
  if (matchedQueryNames.size <= 1) return deduped.slice(0, limit);

  const namesInQueryOrder = [...matchedQueryNames].sort((a, b) => {
    const ai = normalizedMessage.indexOf(a);
    const bi = normalizedMessage.indexOf(b);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const selected: RetrievedWorldEvent[] = [];
  for (const name of namesInQueryOrder) {
    const match = deduped.find((item) => item.reasons.includes(`name:${name}`));
    if (match && !selected.includes(match)) selected.push(match);
  }
  for (const item of deduped) {
    if (selected.length >= limit) break;
    if (!selected.includes(item)) selected.push(item);
  }
  return selected.slice(0, limit);
}

export function buildWorldEventMemoryInstruction(items: RetrievedWorldEvent[]): string {
  if (!items.length) return "";
  const observations = items.map((item) => item.observation);
  const contradictionSets = resolveContradictionEvidence(observations);
  const contradictionByKey = new Map(
    contradictionSets.map((set) => [set.propositionKey, set]),
  );
  const localProjection = projectWorldModel(observations);
  const localProjectionByKey = new Map(
    localProjection.map((state) => [
      `${state.kairaInstanceId}::${state.propositionKey}`,
      state,
    ]),
  );

  const lines = items.map((item, index) => {
    const observation = item.observation;
    const event = observation.event;
    const actor = event.actor?.name || "çözülmedi";
    const target = event.target?.name || "çözülmedi";
    const epistemic = observation.kind === "reported_claim"
      ? "KULLANICININ AKTARDIĞI İDDİA"
      : "DOĞRUDAN ETKİLEŞİM";
    const certainty = observation.status === "grounded" ? "grounded" : "ambiguous";
    const propositionKey = observationPropositionKey(observation);
    const contradiction = contradictionByKey.get(propositionKey);
    // Prefer the full-history projection carried by retrieval. Fallback keeps
    // this formatter backwards compatible for tests/legacy callers that build
    // RetrievedWorldEvent objects manually.
    const projectedState = item.projectedState || localProjectionByKey.get(projectionKey(observation));
    const conflictLabel =
      projectedState?.evidenceStatus === "conflicting" || contradiction?.status === "conflicting"
        ? "; ÇELİŞEN KANIT"
        : "";
    const polarity = event.polarity ? `; polarity=${event.polarity}` : "";
    const stateLabel = projectedState
      ? `; state=${projectedState.assertionState}; lifecycle=${projectedState.lifecycle.state}`
      : "";
    const temporal = event.temporal?.resolved
      ? `; zaman=${event.temporal.resolved.startAt}..${event.temporal.resolved.endAt}`
      : "";
    const facts = (event.memoryFacts ?? [])
      .filter((fact) => fact.confidence >= 0.72)
      .map((fact) => `${fact.subjectId}.${fact.attributeKey}=${String(fact.value)}`)
      .join(", ");
    const factText = facts ? `; facts=${facts}` : "";
    return `- #${index + 1} [${epistemic}; ${certainty}${polarity}${stateLabel}${temporal}${conflictLabel}; güven=${Number(event.certainty ?? 0).toFixed(2)}${factText}] ${actor} -> ${target}: ${event.eventType}. Kanıt: ${event.raw}`;
  });

  return `WORLD MODEL HAFIZASI (retrieval sırasına göre):\n${lines.join("\n")}\nKURALLAR:\n- state ve lifecycle alanları immutable kanıtlardan türetilmiş CANONICAL READ-MODEL özetidir; ham kanıtı silmez veya yeni olay yaratmaz.\n- Retrieval sonucu projectedState taşıyorsa bu state top-N seçimi ÖNCESİ tam aday kanıt kümesinden hesaplanmıştır; seçilen alt kümeden yeniden yorumlama yapma.\n- state=conflicting ise en yeni polarity ne olursa olsun proposition'ı doğrulanmış gerçek gibi anlatma.\n- lifecycle=planned/executed/cancelled/postponed/failed yalnızca aynı canonical proposition'ın mevcut plan generation kanıtından gelir; eski generation sonucunu yeni plana taşıma.\n- Kullanıcı geçmişte kimin ne dediğini soruyorsa ve burada matching grounded reported_claim varsa, bu kayıt kullanıcının daha önce aktardığı şeyi hatırlamak için YETERLİ KANITTIR. Böyle bir kayıt varken \"kaydım yok\" veya \"emin değilim\" deme. Cevabı epistemik olarak doğru kur: \"bana daha önce X'in Y dediğini söylemiştin\" gibi.\n- Çözümlenmiş zaman aralığı varsa kullanıcıdaki temporal ifadeyle eşleşen kanıtlar retrieval tarafından önceden sınırlandırılmıştır; bu zamanı yeniden ham metinden tahmin etme.\n- temporal_graph_neighbor reason'lı kanıtlar yalnızca persisted provenance ile bağlı olaylardır; graph dışında yeni bir önce/sonra ilişkisi UYDURMA.\n- \"En son\" sorularında aynı kişiyle eşleşen retrieval sırasındaki ilk kayıt en güncel kanıttır; bu seçim timestamp ile belirlenir, lexical score eski kaydı öne geçiremez.\n- Birden fazla açık isimli karşılaştırmalı soruda her isim için getirilen kanıtı ayrı değerlendir; bir kişinin kaydı diğer kişinin yerine geçmez.\n- ÇELİŞEN KANIT etiketi varsa aynı canonical proposition için zıt polarity kayıtları vardır. En yeni kaydı güncel kanıt olarak kullanabilirsin ama onu otomatik doğrulanmış gerçek sayma; gerektiğinde önceki ve sonraki iddiayı ayrı belirt.\n- reported_claim kayıtlarını doğrulanmış dünya gerçeği gibi anlatma. ambiguous kayıtlarda kişi/olay ayrıntısı uydurma. direct_interaction ile kullanıcının aktardığı iddiayı birbirine karıştırma. Birbiriyle çelişen veya zaman içinde değişen kayıtlar varsa tek bir gerçeğe zorla birleştirme; kayıtları ayrı kanıtlar olarak koru.`;
}
