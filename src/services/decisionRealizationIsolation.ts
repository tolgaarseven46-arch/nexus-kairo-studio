export const DECISION_REALIZATION_BOUNDARY_VERSION = 1 as const;

export interface PlatformDecisionContextV1 {
  semanticEvidence: unknown;
  relationshipEvidence: unknown;
  appraisalEvidence: unknown;
  memoryEvidence: unknown;
  platformAuthorityFacts: unknown;
}

export interface ToneOnlyRealizationContextV1 {
  explicitFormOfAddress?: string;
  explicitFormality?: "formal" | "informal";
  locale?: string;
  language?: string;
  gender?: string;
  ageBand?: string;
  roomContext?: "dm" | "small_room" | "large_room" | "private_conversation";
  recentStyle?: {
    formality?: "formal" | "informal";
    slangLevel?: "low" | "medium" | "high";
    messageLength?: "short" | "medium" | "long";
  };
}

export interface DecisionComparableProjection {
  actionType?: string;
  capabilityType?: string;
  confidence?: number;
  severity?: number;
  scope?: unknown;
  continueConversation?: boolean;
  allowQuestion?: boolean;
  allowAdvice?: boolean;
  allowHumor?: boolean;
  allowAffection?: boolean;
  socialMove?: string;
}

export type DecisionFunction<T> = (
  context: PlatformDecisionContextV1,
) => T;

export type DecisionProjection<T> = (
  decision: T,
) => DecisionComparableProjection;

export function assertDecisionParityAcrossToneContexts<T>(input: {
  decisionContext: PlatformDecisionContextV1;
  toneContexts: ToneOnlyRealizationContextV1[];
  decide: DecisionFunction<T>;
  project: DecisionProjection<T>;
}): DecisionComparableProjection {
  if (input.toneContexts.length < 2) {
    throw new Error("decision_parity_requires_multiple_tone_contexts");
  }

  // Deliberately do not pass toneContexts to decide().
  // Tone-only information is structurally unavailable at this seam.
  const baseline = input.project(input.decide(input.decisionContext));
  const baselineJson = JSON.stringify(baseline);

  for (const _toneContext of input.toneContexts.slice(1)) {
    const candidate = input.project(input.decide(input.decisionContext));
    if (JSON.stringify(candidate) !== baselineJson) {
      throw new Error("tone_context_changed_decision_output");
    }
  }

  return baseline;
}

export function realizeWithToneContext<TDecision, TOutput>(input: {
  decision: TDecision;
  toneContext: ToneOnlyRealizationContextV1;
  realize: (
    decision: TDecision,
    toneContext: ToneOnlyRealizationContextV1,
  ) => TOutput;
}): TOutput {
  return input.realize(input.decision, input.toneContext);
}
