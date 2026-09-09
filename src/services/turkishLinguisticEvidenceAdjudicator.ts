import type { SemanticInterpretation } from "../types/semanticInterpretation";
import {
  hasMorphologyTag,
  morphologyAnalysesAgreeOnTag,
  type TurkishMorphologyEvidence,
} from "../types/turkishLinguisticEvidence";

export interface CanonicalLinguisticEvidenceInput {
  morphology?: TurkishMorphologyEvidence;
  /**
   * Typed L3/L5 evidence produced upstream. This module never parses raw text.
   * These optional hints are intentionally narrow for the first bounded slice.
   */
  socialRoutine?: SemanticInterpretation["discourseFacets"]["socialRoutine"];
  apologyCandidate?: boolean;
  adviceCandidate?: boolean;
  polarQuestionClause?: boolean;
}

const appendEvidence = (
  interpretation: SemanticInterpretation,
  cues: string[],
  confidence: number,
): SemanticInterpretation => ({
  ...interpretation,
  evidence: [
    ...interpretation.evidence,
    {
      source: "reconciled" as const,
      provider: "typed_turkish_linguistic_evidence",
      cues,
      confidence,
    },
  ].slice(-8),
});

const morphologyTokens = (input: CanonicalLinguisticEvidenceInput) =>
  input.morphology?.tokens ?? [];

const hasUnanimousTag = (
  input: CanonicalLinguisticEvidenceInput,
  tag: string,
): boolean => morphologyTokens(input).some((token) =>
  morphologyAnalysesAgreeOnTag(token, tag),
);

const hasAnyTag = (
  input: CanonicalLinguisticEvidenceInput,
  tag: string,
): boolean => morphologyTokens(input).some((token) => hasMorphologyTag(token, tag));

/**
 * Canonical L6 typed-evidence reconciliation.
 *
 * Authority rule: this function consumes only typed linguistic evidence plus an
 * existing SemanticInterpretation@2. It never reads raw user text and never
 * creates a second semantic producer. Ambiguous morphology can widen
 * uncertainty, but only unanimous/scoped evidence may narrow or correct a field.
 */
export function reconcileSemanticInterpretationWithLinguisticEvidence(
  interpretation: SemanticInterpretation,
  input: CanonicalLinguisticEvidenceInput,
): SemanticInterpretation {
  let next = interpretation;

  if (input.socialRoutine && input.socialRoutine !== "none") {
    const routine = input.socialRoutine;
    next = {
      ...next,
      primaryIntent: routine === "greeting" ? "greeting" : "smalltalk",
      discourseFacets: {
        ...next.discourseFacets,
        socialRoutine: routine,
      },
      uncertainty: {
        ...next.uncertainty,
        intent: Math.min(next.uncertainty.intent, 0.2),
      },
    };
    next = appendEvidence(next, [`typed_social_routine:${routine}`], 0.9);
  }

  const unanimousNeg = hasUnanimousTag(input, "NEG");
  if (unanimousNeg && input.apologyCandidate && next.apology) {
    next = {
      ...next,
      apology: false,
      secondarySocialActs: next.secondarySocialActs.filter((act) => act !== "apology"),
      primaryIntent: next.primaryIntent === "apology" ? "smalltalk" : next.primaryIntent,
      uncertainty: {
        ...next.uncertainty,
        intent: Math.min(next.uncertainty.intent, 0.2),
      },
    };
    next = appendEvidence(next, ["morphology_unanimous_NEG_blocks_apology"], 0.95);
  }

  if (unanimousNeg && input.adviceCandidate && next.discourseFacets.adviceRequested) {
    next = {
      ...next,
      discourseFacets: {
        ...next.discourseFacets,
        adviceRequested: false,
      },
      uncertainty: {
        ...next.uncertainty,
        intent: Math.min(next.uncertainty.intent, 0.2),
      },
    };
    next = appendEvidence(next, ["morphology_unanimous_NEG_blocks_advice_request"], 0.95);
  }

  const anyQuestion = hasAnyTag(input, "QUES");
  const unanimousQuestion = hasUnanimousTag(input, "QUES");
  if (input.polarQuestionClause && anyQuestion) {
    next = {
      ...next,
      primaryIntent: "information_request",
      uncertainty: {
        ...next.uncertainty,
        intent: Math.min(next.uncertainty.intent, 0.2),
      },
    };
    next = appendEvidence(next, ["morphology_QUES_with_typed_polar_clause"], 0.92);
  } else if (anyQuestion && !unanimousQuestion) {
    next = {
      ...next,
      uncertainty: {
        ...next.uncertainty,
        overall: Math.max(next.uncertainty.overall, 0.65),
        intent: Math.max(next.uncertainty.intent, 0.65),
        ambiguousReadings: Array.from(new Set([
          ...(next.uncertainty.ambiguousReadings ?? []),
          "question_particle_vs_non_question_homograph",
        ])).slice(0, 8),
      },
    };
    next = appendEvidence(next, ["ambiguous_morphology_QUES_not_promoted"], 0.7);
  }

  return next;
}
