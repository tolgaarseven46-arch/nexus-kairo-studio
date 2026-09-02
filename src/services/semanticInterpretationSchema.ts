/**
 * Validation + normalization for the canonical SemanticInterpretation@2 schema
 * (ADR-0006). Unwired in PR1: used only by tests and by the (also unwired)
 * legacy projection.
 */

import {
  EMPTY_SEVERITY_VECTOR,
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type InterpretationEvidence,
  type InterpretationUncertainty,
  type SemanticInterpretation,
  type SemanticPrimaryIntent,
  type SemanticSocialAct,
  type SemanticTarget,
  type SemanticValence,
  type SeverityVector,
} from "../types/semanticInterpretation";

const PRIMARY_INTENTS = new Set<SemanticPrimaryIntent>([
  "greeting",
  "smalltalk",
  "question",
  "information_request",
  "emotional_share",
  "affection",
  "banter",
  "insult",
  "rejection",
  "apology",
  "repair",
  "complaint",
  "command",
  "support",
  "compliment",
  "boundary_test",
  "other",
]);

const SOCIAL_ACTS = new Set<SemanticSocialAct>([
  "banter",
  "insult",
  "coercion",
  "manipulation",
  "affection",
  "repair",
  "apology",
  "boundary_test",
  "reassurance_seek",
  "reconciliation",
  "mockery",
  "challenge",
  "closeness_bid",
  "stop_request",
  "privacy_violation",
]);

const TARGETS = new Set<SemanticTarget>(["kaira", "third_party", "self", "event", "unknown"]);
const VALENCES = new Set<SemanticValence>(["positive", "negative", "neutral"]);

const clamp01 = (value: unknown): number => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(1, n));
};

const asBool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

function normalizeSeverity(value: unknown): SeverityVector {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    disrespect: clamp01(v.disrespect),
    coercion: clamp01(v.coercion),
    manipulation: clamp01(v.manipulation),
    privacy: clamp01(v.privacy),
    aggression: clamp01(v.aggression),
  };
}

function normalizeUncertainty(value: unknown): InterpretationUncertainty {
  const u = (value ?? {}) as Record<string, unknown>;
  const overall = clamp01(u.overall);
  const out: InterpretationUncertainty = {
    // A missing uncertainty block is itself uncertain — default wide, never 0.
    overall: value == null ? 0.5 : overall,
    intent: value == null ? 0.5 : clamp01(u.intent),
    target: value == null ? 0.5 : clamp01(u.target),
    severity: value == null ? 0.5 : clamp01(u.severity),
  };
  if (Array.isArray(u.ambiguousReadings)) {
    const readings = u.ambiguousReadings.filter((x): x is string => typeof x === "string");
    if (readings.length) out.ambiguousReadings = readings.slice(0, 8);
  }
  return out;
}

function normalizeEvidence(value: unknown): InterpretationEvidence[] {
  if (!Array.isArray(value)) return [];
  const out: InterpretationEvidence[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const source = e.source === "llm" || e.source === "regex" || e.source === "reconciled" ? e.source : "regex";
    out.push({
      source,
      ...(typeof e.provider === "string" ? { provider: e.provider } : {}),
      cues: Array.isArray(e.cues) ? e.cues.filter((x): x is string => typeof x === "string").slice(0, 24) : [],
      confidence: clamp01(e.confidence),
    });
  }
  return out.slice(0, 8);
}

/** Structural type guard for a fully-formed SemanticInterpretation@2 value. */
export function isSemanticInterpretation(value: unknown): value is SemanticInterpretation {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== SEMANTIC_INTERPRETATION_SCHEMA_VERSION) return false;
  if (typeof v.raw !== "string" || typeof v.normalized !== "string") return false;
  if (!PRIMARY_INTENTS.has(v.primaryIntent as SemanticPrimaryIntent)) return false;
  if (!Array.isArray(v.secondarySocialActs)) return false;
  if (!(v.secondarySocialActs as unknown[]).every((a) => SOCIAL_ACTS.has(a as SemanticSocialAct))) return false;
  if (!TARGETS.has(v.target as SemanticTarget)) return false;
  if (!VALENCES.has(v.valence as SemanticValence)) return false;
  if (!v.severity || typeof v.severity !== "object") return false;
  if (!v.uncertainty || typeof v.uncertainty !== "object") return false;
  if (!Array.isArray(v.evidence)) return false;
  const finite01 = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
  return (
    finite01(v.jokingConfidence) &&
    finite01(v.sincerityConfidence) &&
    finite01(v.affection) &&
    finite01(v.support) &&
    finite01(v.compliment) &&
    finite01(v.emotionalLoad) &&
    typeof v.apology === "boolean" &&
    typeof v.repairAttempt === "boolean" &&
    typeof v.stopRequest === "boolean"
  );
}

/**
 * Coerces a partial / provider value into a valid SemanticInterpretation.
 * Missing or malformed fields fall back to conservative neutral values with wide
 * uncertainty. Never throws.
 */
export function normalizeSemanticInterpretation(
  value: unknown,
  message = "",
): SemanticInterpretation {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const raw = asString(v.raw, message);
  const acts = Array.isArray(v.secondarySocialActs)
    ? Array.from(
        new Set(
          (v.secondarySocialActs as unknown[]).filter((a): a is SemanticSocialAct =>
            SOCIAL_ACTS.has(a as SemanticSocialAct),
          ),
        ),
      )
    : [];
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw,
    normalized: asString(v.normalized, raw.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()),
    primaryIntent: PRIMARY_INTENTS.has(v.primaryIntent as SemanticPrimaryIntent)
      ? (v.primaryIntent as SemanticPrimaryIntent)
      : "other",
    secondarySocialActs: acts,
    target: TARGETS.has(v.target as SemanticTarget) ? (v.target as SemanticTarget) : "unknown",
    valence: VALENCES.has(v.valence as SemanticValence) ? (v.valence as SemanticValence) : "neutral",
    severity: v.severity === undefined ? { ...EMPTY_SEVERITY_VECTOR } : normalizeSeverity(v.severity),
    jokingConfidence: clamp01(v.jokingConfidence),
    sincerityConfidence: v.sincerityConfidence === undefined ? 0.5 : clamp01(v.sincerityConfidence),
    affection: clamp01(v.affection),
    support: clamp01(v.support),
    compliment: clamp01(v.compliment),
    emotionalLoad: clamp01(v.emotionalLoad),
    apology: asBool(v.apology),
    repairAttempt: asBool(v.repairAttempt),
    stopRequest: asBool(v.stopRequest),
    uncertainty: normalizeUncertainty(v.uncertainty),
    evidence: normalizeEvidence(v.evidence),
  };
}
