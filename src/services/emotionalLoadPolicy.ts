import type { SemanticInterpretation } from "../types/semanticInterpretation";

export type EmotionalLoadBand = "none" | "mild" | "salient" | "intense";

/**
 * Policy thresholds are deliberately separate from semantic extraction.
 * The parser measures load; this module decides when that measurement is
 * trustworthy enough to cross a legacy/runtime policy boundary.
 */
export const EMOTIONAL_LOAD_POLICY = Object.freeze({
  projectionMinLoad: 0.3,
  salientLoad: 0.6,
  intenseLoad: 0.8,
  minEvidenceConfidence: 0.65,
  maxUncertainty: 0.55,
});

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function emotionalLoadBand(load: number): EmotionalLoadBand {
  const normalized = clamp01(load);
  if (normalized >= EMOTIONAL_LOAD_POLICY.intenseLoad) return "intense";
  if (normalized >= EMOTIONAL_LOAD_POLICY.salientLoad) return "salient";
  if (normalized >= EMOTIONAL_LOAD_POLICY.projectionMinLoad) return "mild";
  return "none";
}

export function emotionalLoadEvidenceConfidence(
  interpretation: Pick<SemanticInterpretation, "evidence" | "uncertainty">,
): number {
  if (interpretation.evidence.length > 0) {
    return clamp01(
      Math.max(...interpretation.evidence.map((item) => item.confidence)),
    );
  }
  return clamp01(1 - interpretation.uncertainty.overall);
}

export function isEmotionalLoadMeasurementTrusted(
  interpretation: Pick<SemanticInterpretation, "emotionalLoad" | "evidence" | "uncertainty">,
): boolean {
  if (emotionalLoadBand(interpretation.emotionalLoad) === "none") return false;
  return (
    emotionalLoadEvidenceConfidence(interpretation) >=
      EMOTIONAL_LOAD_POLICY.minEvidenceConfidence &&
    interpretation.uncertainty.overall <= EMOTIONAL_LOAD_POLICY.maxUncertainty
  );
}

/**
 * Deterministic regex-floor evidence is an independent safety floor and cannot
 * be erased by an uncertain LLM reading. The canonical interpretation may only
 * raise that floor when its own emotional-load measurement passes the explicit
 * trust gate.
 */
export function calibrateProjectedEmotionalLoad(
  interpretation: Pick<SemanticInterpretation, "emotionalLoad" | "evidence" | "uncertainty">,
  deterministicFloorLoad: number,
): number {
  const floor = clamp01(deterministicFloorLoad);
  const measured = clamp01(interpretation.emotionalLoad);
  const trustedMeasured = isEmotionalLoadMeasurementTrusted(interpretation)
    ? measured
    : 0;
  return Math.max(floor, trustedMeasured);
}

/** KDM's coarse `duygusal_yük` label is reserved for salient-or-higher load. */
export function isKdmSalientEmotionalLoad(load: number): boolean {
  return emotionalLoadBand(load) === "salient" || emotionalLoadBand(load) === "intense";
}
