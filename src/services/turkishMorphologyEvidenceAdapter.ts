import type { TurkishMorphologyResult } from "./languageUnderstandingService";
import type {
  TurkishMorphAnalysisEvidence,
  TurkishMorphologyEvidence,
  TurkishMorphTokenEvidence,
} from "../types/turkishLinguisticEvidence";

const clampConfidence = (value: number | undefined): number | undefined => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(1, value));
};

/**
 * Backward-compatible bridge from the existing single-analysis morphology seam
 * into the richer L2 evidence contract.
 *
 * It never invents alternatives. A legacy token becomes either one retained
 * analysis or an explicit zero-parse token. Future rich providers can bypass
 * this adapter and populate all competing analyses directly.
 */
export function adaptLegacyMorphologyEvidence(
  result: TurkishMorphologyResult,
): TurkishMorphologyEvidence {
  const tokens: TurkishMorphTokenEvidence[] = result.tokens.map((token) => {
    const hasAnalysisEvidence = Boolean(
      token.lemma ||
      token.pos ||
      (Array.isArray(token.morphemes) && token.morphemes.length > 0),
    );

    const analyses: TurkishMorphAnalysisEvidence[] = hasAnalysisEvidence
      ? [{
          ...(token.lemma ? { lemma: token.lemma } : {}),
          ...(token.pos ? { pos: token.pos } : {}),
          morphemes: [...(token.morphemes ?? [])],
          ...(clampConfidence(token.confidence) !== undefined
            ? { confidence: clampConfidence(token.confidence) }
            : {}),
        }]
      : [];

    return {
      surface: token.surface,
      ...(token.normalized ? { normalized: token.normalized } : {}),
      analyses,
      ...(analyses.length === 1 ? { preferredAnalysisIndex: 0 } : {}),
    };
  });

  return {
    provider: result.provider,
    normalizedText: result.normalizedText,
    tokens,
  };
}
