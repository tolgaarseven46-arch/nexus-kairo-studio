/** Validation + normalization for canonical SemanticInterpretation@2 (ADR-0006). */
import {
  EMPTY_SEVERITY_VECTOR,
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type InterpretationEvidence,
  type InterpretationUncertainty,
  type SemanticDiscourseAct,
  type SemanticDiscourseFacets,
  type SemanticInterpretation,
  type SemanticGroundingField,
  type SemanticGroundingTrace,
  type SemanticPrimaryIntent,
  type SemanticRelationalAct,
  type SemanticRepairSignal,
  type SemanticSocialAct,
  type SemanticSocialRoutine,
  type SemanticTarget,
  type SemanticValence,
  type SeverityVector,
} from "../types/semanticInterpretation";

const PRIMARY_INTENTS = new Set<SemanticPrimaryIntent>([
  "greeting", "smalltalk", "question", "information_request", "emotional_share",
  "affection", "banter", "insult", "rejection", "apology", "repair", "complaint",
  "command", "support", "compliment", "boundary_test", "other",
]);
const SOCIAL_ACTS = new Set<SemanticSocialAct>([
  "banter", "insult", "coercion", "manipulation", "affection", "repair", "apology",
  "boundary_test", "reassurance_seek", "reconciliation", "mockery", "challenge",
  "closeness_bid", "stop_request", "privacy_violation",
]);
const TARGETS = new Set<SemanticTarget>(["kaira", "third_party", "self", "event", "unknown"]);
const VALENCES = new Set<SemanticValence>(["positive", "negative", "neutral"]);
const ROUTINES = new Set<SemanticSocialRoutine>([
  "none", "greeting", "how_are_you", "what_doing", "thanks", "agreement",
  "goodbye", "good_night", "emotional_opening",
]);
const DISCOURSE_ACTS = new Set<SemanticDiscourseAct>([
  "none", "correction", "topic_shift", "recall_request", "confusion_or_challenge",
]);
const REPAIR_SIGNALS = new Set<SemanticRepairSignal>([
  "none", "clarification_request", "relevance_challenge",
]);
const RELATIONAL_ACTS = new Set<SemanticRelationalAct>([
  "none", "reassurance_seek", "repair_probe", "reconciliation_attempt", "challenge",
  "mockery", "closeness_bid",
]);
const GROUNDING_FIELDS = new Set<SemanticGroundingField>([
  "primaryIntent", "secondarySocialActs", "target", "valence", "severity",
  "affection", "support", "compliment", "emotionalLoad", "apology",
  "repairAttempt", "stopRequest", "socialRoutine", "discourseAct", "repairSignal",
  "adviceRequested", "knowledgeQuery", "selfMemoryQuery", "worldMemory", "relationalAct",
  "stopQuestions", "stopTalking",
]);

const clamp01 = (value: unknown): number => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(1, n));
};
const asBool = (value: unknown, fallback = false): boolean => typeof value === "boolean" ? value : fallback;
const asString = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;

function normalizeSeverity(value: unknown): SeverityVector {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    disrespect: clamp01(v.disrespect), coercion: clamp01(v.coercion),
    manipulation: clamp01(v.manipulation), privacy: clamp01(v.privacy), aggression: clamp01(v.aggression),
  };
}
function normalizeUncertainty(value: unknown): InterpretationUncertainty {
  const u = (value ?? {}) as Record<string, unknown>;
  const out: InterpretationUncertainty = {
    overall: value == null ? 0.5 : clamp01(u.overall),
    intent: value == null ? 0.5 : clamp01(u.intent),
    target: value == null ? 0.5 : clamp01(u.target),
    severity: value == null ? 0.5 : clamp01(u.severity),
  };
  if (Array.isArray(u.ambiguousReadings)) {
    const values = u.ambiguousReadings.filter((x): x is string => typeof x === "string").slice(0, 8);
    if (values.length) out.ambiguousReadings = values;
  }
  return out;
}
function normalizeEvidence(value: unknown): InterpretationEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): InterpretationEvidence[] => {
    if (!raw || typeof raw !== "object") return [];
    const e = raw as Record<string, unknown>;
    const source = e.source === "llm" || e.source === "regex" || e.source === "reconciled" ? e.source : "llm";
    return [{
      source,
      ...(typeof e.provider === "string" ? { provider: e.provider } : {}),
      cues: Array.isArray(e.cues) ? e.cues.filter((x): x is string => typeof x === "string").slice(0, 24) : [],
      confidence: clamp01(e.confidence),
    }];
  }).slice(0, 8);
}
function normalizeGrounding(value: unknown): SemanticGroundingTrace | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const fields = (raw: unknown): SemanticGroundingField[] => Array.isArray(raw)
    ? Array.from(new Set(raw.filter((x): x is SemanticGroundingField => GROUNDING_FIELDS.has(x as SemanticGroundingField))))
    : [];
  return {
    adjudicatedAgainstContextFree: asBool(v.adjudicatedAgainstContextFree),
    contextInfluencedFields: fields(v.contextInfluencedFields),
    rejectedContextFields: fields(v.rejectedContextFields),
  };
}
function normalizeQuery(value: unknown): SemanticDiscourseFacets["knowledgeQuery"] {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.surface !== "string" || !v.surface.trim()) return null;
  return {
    surface: v.surface.trim().replace(/\s+/g, " ").slice(0, 96),
    ...(typeof v.conceptId === "string" && v.conceptId.trim() ? { conceptId: v.conceptId.trim().replace(/\s+/g, " ").slice(0, 96) } : {}),
    confidence: clamp01(v.confidence),
  };
}
function canonicalMemoryKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_.:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 96);
}
function normalizeWorldMemory(value: unknown): SemanticInterpretation["worldMemory"] {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const claims = Array.isArray(v.claims) ? v.claims.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const c = raw as Record<string, unknown>;
    const subjectId = canonicalMemoryKey(c.subjectId);
    const attributeKey = canonicalMemoryKey(c.attributeKey);
    const validValue = typeof c.value === "string" || typeof c.value === "boolean" || (typeof c.value === "number" && Number.isFinite(c.value));
    if (!subjectId || !attributeKey || !validValue) return [];
    const normalizedValue = typeof c.value === "string" ? c.value.trim().replace(/\s+/g, " ").slice(0, 160) : c.value;
    if (normalizedValue === "") return [];
    return [{ subjectId, attributeKey, value: normalizedValue, confidence: clamp01(c.confidence) }];
  }).slice(0, 12) : [];
  let query = null;
  if (v.query && typeof v.query === "object") {
    const q = v.query as Record<string, unknown>;
    const subjectId = canonicalMemoryKey(q.subjectId);
    const attributeKey = canonicalMemoryKey(q.attributeKey);
    if (subjectId && attributeKey) query = { subjectId, attributeKey, confidence: clamp01(q.confidence) };
  }
  return { claims, query };
}

function normalizeSelfMemoryQuery(value: unknown): SemanticDiscourseFacets["selfMemoryQuery"] {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.surface !== "string" || !v.surface.trim()) return null;
  const scope = v.scope === "self_fact" || v.scope === "autobiographical_memory" || v.scope === "any" ? v.scope : "any";
  const retrievalMode = v.retrievalMode === "broad" ? "broad" : "targeted";
  return {
    surface: v.surface.trim().replace(/\s+/g, " ").slice(0, 128), scope, retrievalMode,
    ...(typeof v.factKey === "string" && v.factKey.trim() ? { factKey: v.factKey.trim().slice(0, 96) } : {}),
    confidence: clamp01(v.confidence),
  };
}
function normalizeDiscourseFacets(value: unknown): SemanticDiscourseFacets {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    socialRoutine: ROUTINES.has(v.socialRoutine as SemanticSocialRoutine) ? v.socialRoutine as SemanticSocialRoutine : "none",
    discourseAct: DISCOURSE_ACTS.has(v.discourseAct as SemanticDiscourseAct) ? v.discourseAct as SemanticDiscourseAct : "none",
    repairSignal: REPAIR_SIGNALS.has(v.repairSignal as SemanticRepairSignal) ? v.repairSignal as SemanticRepairSignal : "none",
    adviceRequested: asBool(v.adviceRequested),
    knowledgeQuery: normalizeQuery(v.knowledgeQuery),
    selfMemoryQuery: normalizeSelfMemoryQuery(v.selfMemoryQuery),
    relationalAct: RELATIONAL_ACTS.has(v.relationalAct as SemanticRelationalAct) ? v.relationalAct as SemanticRelationalAct : "none",
    relationalIntensity: clamp01(v.relationalIntensity),
    stopQuestions: asBool(v.stopQuestions),
    stopTalking: asBool(v.stopTalking),
  };
}

export function isSemanticInterpretation(value: unknown): value is SemanticInterpretation {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== SEMANTIC_INTERPRETATION_SCHEMA_VERSION) return false;
  if (typeof v.raw !== "string" || typeof v.normalized !== "string") return false;
  if (!PRIMARY_INTENTS.has(v.primaryIntent as SemanticPrimaryIntent)) return false;
  if (!Array.isArray(v.secondarySocialActs) || !(v.secondarySocialActs as unknown[]).every((a) => SOCIAL_ACTS.has(a as SemanticSocialAct))) return false;
  if (!TARGETS.has(v.target as SemanticTarget) || !VALENCES.has(v.valence as SemanticValence)) return false;
  if (!v.severity || typeof v.severity !== "object" || !v.uncertainty || typeof v.uncertainty !== "object") return false;
  if (!v.discourseFacets || typeof v.discourseFacets !== "object" || !Array.isArray(v.evidence)) return false;
  const finite01 = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
  return finite01(v.jokingConfidence) && finite01(v.sincerityConfidence) && finite01(v.affection) &&
    finite01(v.support) && finite01(v.compliment) && finite01(v.emotionalLoad) &&
    typeof v.apology === "boolean" && typeof v.repairAttempt === "boolean" && typeof v.stopRequest === "boolean" &&
    typeof (v.discourseFacets as Record<string, unknown>).stopQuestions === "boolean" &&
    typeof (v.discourseFacets as Record<string, unknown>).stopTalking === "boolean" &&
    v.stopRequest === (v.discourseFacets as Record<string, unknown>).stopTalking;
}

export function normalizeSemanticInterpretation(value: unknown, message = ""): SemanticInterpretation {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const raw = asString(v.raw, message);
  const acts = Array.isArray(v.secondarySocialActs)
    ? Array.from(new Set((v.secondarySocialActs as unknown[]).filter((a): a is SemanticSocialAct => SOCIAL_ACTS.has(a as SemanticSocialAct))))
    : [];
  const discourseFacets = normalizeDiscourseFacets(v.discourseFacets);
  const worldMemory = normalizeWorldMemory(v.worldMemory);
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw,
    normalized: asString(v.normalized, raw.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()),
    primaryIntent: PRIMARY_INTENTS.has(v.primaryIntent as SemanticPrimaryIntent) ? v.primaryIntent as SemanticPrimaryIntent : "other",
    secondarySocialActs: acts,
    target: TARGETS.has(v.target as SemanticTarget) ? v.target as SemanticTarget : "unknown",
    valence: VALENCES.has(v.valence as SemanticValence) ? v.valence as SemanticValence : "neutral",
    severity: v.severity === undefined ? { ...EMPTY_SEVERITY_VECTOR } : normalizeSeverity(v.severity),
    jokingConfidence: clamp01(v.jokingConfidence),
    sincerityConfidence: v.sincerityConfidence === undefined ? 0.5 : clamp01(v.sincerityConfidence),
    affection: clamp01(v.affection), support: clamp01(v.support), compliment: clamp01(v.compliment), emotionalLoad: clamp01(v.emotionalLoad),
    apology: asBool(v.apology), repairAttempt: asBool(v.repairAttempt), stopRequest: discourseFacets.stopTalking,
    discourseFacets,
    ...(worldMemory ? { worldMemory } : {}),
    uncertainty: normalizeUncertainty(v.uncertainty), evidence: normalizeEvidence(v.evidence),
    ...(normalizeGrounding(v.grounding) ? { grounding: normalizeGrounding(v.grounding) } : {}),
  };
}
