/**
 * Typed L1/L2 evidence contract for the pre-Gemini Turkish language foundation.
 *
 * This object is deliberately NOT semantic truth. It may contain competing
 * analyses and zero-parse tokens. Only the canonical L6 language-understanding
 * adjudicator may turn this evidence into SemanticInterpretation@2 fields.
 */
export interface TurkishMorphAnalysisEvidence {
  lemma?: string;
  pos?: string;
  morphemes: string[];
  /** Analyzer-local confidence when available; absent means unscored. */
  confidence?: number;
}

export interface TurkishMorphTokenEvidence {
  surface: string;
  normalized?: string;
  /** All retained analyses. Empty means analyzer produced no usable parse. */
  analyses: TurkishMorphAnalysisEvidence[];
  /**
   * Optional analyzer-preferred analysis. This is evidence ranking only and
   * never grants semantic authority to the morphology provider.
   */
  preferredAnalysisIndex?: number;
}

export interface TurkishMorphologyEvidence {
  provider: string;
  normalizedText: string;
  tokens: TurkishMorphTokenEvidence[];
}

export const hasMorphologyTag = (
  token: TurkishMorphTokenEvidence,
  tag: string,
): boolean => token.analyses.some((analysis) => analysis.morphemes.includes(tag));

export const morphologyAnalysesAgreeOnTag = (
  token: TurkishMorphTokenEvidence,
  tag: string,
): boolean =>
  token.analyses.length > 0 &&
  token.analyses.every((analysis) => analysis.morphemes.includes(tag));

export const morphologyTokenIsUnresolved = (
  token: TurkishMorphTokenEvidence,
): boolean => token.analyses.length === 0;
