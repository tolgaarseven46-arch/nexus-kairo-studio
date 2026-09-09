import type { SemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities, type EntityResolutionResult } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent, type CanonicalWorldEvent } from "./worldEventEngine";
import { isSemanticInterpretation, normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { recognizeCanonicalDiscourseSignals } from "./semanticDiscourseFacetRecognizer";
import { adaptLegacyMorphologyEvidence } from "./turkishMorphologyEvidenceAdapter";
import {
  reconcileSemanticInterpretationWithLinguisticEvidence,
  type CanonicalLinguisticEvidenceInput,
} from "./turkishLinguisticEvidenceAdjudicator";
import type { SemanticDiscourseProjection, SemanticGroundingField, SemanticInterpretation } from "../types/semanticInterpretation";
import {
  appendSemanticFieldEvidence,
  type SemanticEvidenceKind,
  type SemanticFieldProvenance,
} from "../types/semanticFieldProvenance";
import type { TurkishMorphologyEvidence } from "../types/turkishLinguisticEvidence";

export type SemanticRelationshipScope = "kaira_user" | "third_party" | "event" | "unknown";
export type AppraisalSemanticEvent = SemanticEvent & SemanticDiscourseProjection & {
  relationshipScope?: SemanticRelationshipScope;
  semanticUncertainty?: number;
};

export interface TurkishMorphToken {
  surface: string; normalized?: string; lemma?: string; pos?: string; morphemes?: string[]; confidence?: number;
}
export interface TurkishMorphologyResult { provider: string; normalizedText: string; tokens: TurkishMorphToken[]; }
export interface LanguageUnderstandingContext {
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  userName?: string; characterName?: string;
}
export interface MorphologyProvider { name: string; analyze(message: string): Promise<TurkishMorphologyResult>; }
export interface MorphologyEvidenceProvider {
  name: string;
  analyzeEvidence(message: string): Promise<TurkishMorphologyEvidence>;
}
export interface SemanticUnderstandingProvider {
  name: string;
  interpret(input: {
    message: string;
    morphology?: TurkishMorphologyResult;
    morphologyEvidence?: TurkishMorphologyEvidence;
    context?: LanguageUnderstandingContext;
  }): Promise<SemanticInterpretation>;
}

export type LanguageUnderstandingSource = "client_shared" | "semantic_provider" | "fallback_regex";
export interface LanguageUnderstandingResult {
  interpretation: SemanticInterpretation;
  event: AppraisalSemanticEvent;
  entityResolution: EntityResolutionResult;
  worldEvent: CanonicalWorldEvent;
  semanticSource: LanguageUnderstandingSource;
  semanticProvider?: string;
  morphology?: TurkishMorphologyResult;
  morphologyEvidence?: TurkishMorphologyEvidence;
  morphologyProvider?: string;
  semanticFieldProvenance?: SemanticFieldProvenance;
  warnings: string[];
}
export interface LanguageUnderstandingOptions {
  incomingSemanticInterpretation?: unknown;
  morphologyProvider?: MorphologyProvider;
  morphologyEvidenceProvider?: MorphologyEvidenceProvider;
  semanticProvider?: SemanticUnderstandingProvider;
  /** Typed L3/L5 evidence only. Raw-text parsing is not allowed here. */
  linguisticEvidence?: Omit<CanonicalLinguisticEvidenceInput, "morphology">;
  context?: LanguageUnderstandingContext;
}

export function groundSemanticEventForAppraisal(
  message: string,
  event: SemanticEvent & SemanticDiscourseProjection,
  entityResolution: EntityResolutionResult,
): { event: AppraisalSemanticEvent; worldEvent: CanonicalWorldEvent } {
  const worldEvent = buildCanonicalWorldEvent(message, event, entityResolution);
  const actorId = worldEvent.actor?.id;
  const actorSource = worldEvent.actor?.source;
  const targetId = worldEvent.target?.id;
  const targetSource = worldEvent.target?.source;
  let relationshipScope: SemanticRelationshipScope = "unknown";
  const explicitThirdPartyActor = actorSource === "explicit_name" && actorId !== "current_user";
  const explicitThirdPartyTarget = targetSource === "explicit_name" && targetId !== "current_user" && targetId !== "kaira";
  const implicitActiveDyadRepair =
    event.target === "unknown" &&
    entityResolution.namedPeople.length === 0 &&
    (event.apology || event.repairAttempt || event.intent === "apology" || event.intent === "repair");
  if (explicitThirdPartyActor || explicitThirdPartyTarget || event.target === "third_party") relationshipScope = "third_party";
  else if (actorId === "current_user" && targetId === "kaira") relationshipScope = "kaira_user";
  else if (event.target === "kaira" && entityResolution.namedPeople.length === 0) relationshipScope = "kaira_user";
  else if (implicitActiveDyadRepair) relationshipScope = "kaira_user";
  else if (event.target === "event") relationshipScope = "event";

  let appraisalEvent: AppraisalSemanticEvent = {
    ...event,
    target: relationshipScope === "third_party" ? "third_party" : event.target,
    relationshipScope,
  };
  if (relationshipScope === "third_party" && event.valence === "positive") {
    appraisalEvent = { ...appraisalEvent, valence: "neutral", apology: false, repairAttempt: false, support: 0, compliment: 0, affection: 0 };
  }
  return { event: appraisalEvent, worldEvent };
}

function reconcileSemanticTargetWithEntityResolution(
  interpretation: SemanticInterpretation,
  entityResolution: EntityResolutionResult,
): SemanticInterpretation {
  const explicitKairaReference = entityResolution.references.some((ref) =>
    (ref.role === "second_person" || ref.role === "character") &&
    ref.resolvedId === "kaira" &&
    ref.confidence >= 0.9
  );
  const explicitThirdPartyReference = entityResolution.references.some((ref) =>
    ref.role === "named_person" && ref.resolvedId !== "current_user" && ref.resolvedId !== "kaira"
  ) || entityResolution.namedPeople.length > 0;

  if (
    interpretation.target === "unknown" &&
    explicitKairaReference &&
    !explicitThirdPartyReference
  ) {
    return {
      ...interpretation,
      target: "kaira",
      uncertainty: {
        ...interpretation.uncertainty,
        target: Math.min(interpretation.uncertainty.target, 0.2),
      },
      evidence: [
        ...interpretation.evidence,
        {
          source: "reconciled" as const,
          provider: "canonical_language_gateway",
          cues: ["explicit_kaira_reference_completes_unknown_target"],
          confidence: 0.95,
        },
      ].slice(-8),
    };
  }

  if (interpretation.target !== "third_party") return interpretation;
  const relationalAct = interpretation.discourseFacets.relationalAct;
  const dyadicSemantic = relationalAct !== "none" ||
    interpretation.primaryIntent === "affection" ||
    interpretation.primaryIntent === "repair" ||
    interpretation.primaryIntent === "command";
  if (!explicitKairaReference || explicitThirdPartyReference || !dyadicSemantic) return interpretation;
  return {
    ...interpretation,
    target: "kaira",
    uncertainty: {
      ...interpretation.uncertainty,
      target: Math.min(interpretation.uncertainty.target, 0.2),
    },
  };
}

function reconcileNeutralThirdPartyEventOverread(
  interpretation: SemanticInterpretation,
): SemanticInterpretation {
  const lowLoadThirdPartyEventOverread =
    interpretation.primaryIntent === "emotional_share" &&
    interpretation.target === "third_party" &&
    interpretation.emotionalLoad <= 0.35 &&
    interpretation.discourseFacets.socialRoutine === "none" &&
    interpretation.discourseFacets.relationalAct === "none" &&
    interpretation.support <= 0.3 &&
    interpretation.affection <= 0.3;
  if (!lowLoadThirdPartyEventOverread) return interpretation;
  return {
    ...interpretation,
    primaryIntent: "smalltalk",
    evidence: [
      ...interpretation.evidence,
      {
        source: "reconciled",
        provider: "canonical_language_gateway",
        cues: ["third_party_low_emotional_load_without_emotional_opening"],
        confidence: Math.max(0.7, 1 - interpretation.uncertainty.intent),
      },
    ],
  };
}

function reconcileThirdPartyReciprocalRoutineOverread(
  interpretation: SemanticInterpretation,
): SemanticInterpretation {
  const routine = interpretation.discourseFacets.socialRoutine;
  const contradictoryRoutine =
    interpretation.target === "third_party" &&
    (routine === "how_are_you" || routine === "what_doing");
  if (!contradictoryRoutine) return interpretation;

  return {
    ...interpretation,
    discourseFacets: {
      ...interpretation.discourseFacets,
      socialRoutine: "none",
    },
    evidence: [
      ...interpretation.evidence,
      {
        source: "reconciled",
        provider: "canonical_language_gateway",
        cues: ["reciprocal_social_routine_requires_kaira_target"],
        confidence: Math.max(0.8, 1 - interpretation.uncertainty.target),
      },
    ],
  };
}

function reconcileSelfMemoryQueryOwnership(
  interpretation: SemanticInterpretation,
): SemanticInterpretation {
  if (!interpretation.discourseFacets.selfMemoryQuery || interpretation.target === "kaira") {
    return interpretation;
  }

  return {
    ...interpretation,
    discourseFacets: {
      ...interpretation.discourseFacets,
      selfMemoryQuery: null,
    },
    evidence: [
      ...interpretation.evidence,
      {
        source: "reconciled",
        provider: "canonical_language_gateway",
        cues: ["self_memory_query_requires_kaira_target"],
        confidence: Math.max(0.8, 1 - interpretation.uncertainty.target),
      },
    ],
  };
}

function attachCanonicalDiscourseSignals(
  message: string,
  interpretation: SemanticInterpretation,
): SemanticInterpretation {
  const signals = recognizeCanonicalDiscourseSignals(message);
  const cues = Object.entries(signals).filter(([, value]) => value).map(([key]) => key);
  return {
    ...interpretation,
    discourseFacets: {
      ...interpretation.discourseFacets,
      ...signals,
    },
    ...(cues.length
      ? {
          evidence: [
            ...interpretation.evidence,
            {
              source: "reconciled" as const,
              provider: "canonical_discourse_ingestion",
              cues,
              confidence: 1,
            },
          ].slice(-8),
        }
      : {}),
  };
}

type TypedEvidenceProvenanceSpec = {
  fields: SemanticGroundingField[];
  kinds: SemanticEvidenceKind[];
};

const typedEvidenceProvenanceForCue = (cue: string): TypedEvidenceProvenanceSpec | undefined => {
  if (cue.startsWith("typed_social_routine:")) {
    return { fields: ["primaryIntent", "socialRoutine"], kinds: ["discourse"] };
  }
  if (cue === "morphology_unanimous_NEG_blocks_apology") {
    return { fields: ["primaryIntent", "secondarySocialActs", "apology"], kinds: ["morphology"] };
  }
  if (cue === "morphology_unanimous_NEG_blocks_advice_request") {
    return { fields: ["adviceRequested"], kinds: ["morphology"] };
  }
  if (cue === "morphology_QUES_with_typed_polar_clause") {
    return { fields: ["primaryIntent"], kinds: ["morphology", "syntax"] };
  }
  if (cue === "ambiguous_morphology_QUES_not_promoted") {
    return { fields: ["primaryIntent"], kinds: ["morphology"] };
  }
  return undefined;
};

function buildTypedEvidenceProvenance(interpretation: SemanticInterpretation): SemanticFieldProvenance | undefined {
  let provenance: SemanticFieldProvenance = {};
  let populated = false;
  for (const evidence of interpretation.evidence) {
    if (evidence.provider !== "typed_turkish_linguistic_evidence") continue;
    for (const cue of evidence.cues) {
      const spec = typedEvidenceProvenanceForCue(cue);
      if (!spec) continue;
      for (const field of spec.fields) {
        for (const kind of spec.kinds) {
          provenance = appendSemanticFieldEvidence(provenance, field, {
            kind,
            provider: evidence.provider,
            cues: [cue],
            confidence: evidence.confidence,
          });
          populated = true;
        }
      }
    }
  }
  return populated ? provenance : undefined;
}

function buildResult(
  message: string,
  interpretation: SemanticInterpretation,
  entityResolution: EntityResolutionResult,
  rest: Omit<LanguageUnderstandingResult, "interpretation" | "event" | "entityResolution" | "worldEvent" | "semanticFieldProvenance">,
  linguisticEvidence: CanonicalLinguisticEvidenceInput = {},
): LanguageUnderstandingResult {
  interpretation = reconcileSemanticInterpretationWithLinguisticEvidence(interpretation, linguisticEvidence);
  interpretation = attachCanonicalDiscourseSignals(message, interpretation);
  interpretation = reconcileSemanticTargetWithEntityResolution(interpretation, entityResolution);
  interpretation = reconcileNeutralThirdPartyEventOverread(interpretation);
  interpretation = reconcileThirdPartyReciprocalRoutineOverread(interpretation);
  interpretation = reconcileSelfMemoryQueryOwnership(interpretation);
  const projected = projectSemanticEvent(interpretation);
  const grounded = groundSemanticEventForAppraisal(message, projected, entityResolution);
  return {
    interpretation,
    event: {
      ...grounded.event,
      semanticUncertainty: interpretation.uncertainty.overall,
    },
    entityResolution,
    worldEvent: grounded.worldEvent,
    semanticFieldProvenance: buildTypedEvidenceProvenance(interpretation),
    ...rest,
  };
}

/**
 * Single language-understanding gateway.
 * SemanticInterpretation@2 remains the single canonical semantic authority.
 * L2/L3/L5 evidence can only reconcile that object here at L6; no downstream
 * consumer receives permission to reparse raw text.
 */
export async function understandTurkishMessage(
  message: string,
  options: LanguageUnderstandingOptions = {},
): Promise<LanguageUnderstandingResult> {
  const entityResolution = resolveMessageEntities(message, options.context);
  const warnings: string[] = [];

  let morphology: TurkishMorphologyResult | undefined;
  let morphologyEvidence: TurkishMorphologyEvidence | undefined;
  let morphologyProviderName: string | undefined;

  if (options.morphologyEvidenceProvider) {
    try {
      morphologyEvidence = await options.morphologyEvidenceProvider.analyzeEvidence(message);
      morphologyProviderName = options.morphologyEvidenceProvider.name;
    } catch (error) {
      warnings.push(`Morphology evidence provider ${options.morphologyEvidenceProvider.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!morphologyEvidence && options.morphologyProvider) {
    try {
      morphology = await options.morphologyProvider.analyze(message);
      morphologyEvidence = adaptLegacyMorphologyEvidence(morphology);
      morphologyProviderName = options.morphologyProvider.name;
    } catch (error) {
      warnings.push(`Morphology provider ${options.morphologyProvider.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const linguisticEvidence: CanonicalLinguisticEvidenceInput = {
    ...(options.linguisticEvidence ?? {}),
    ...(morphologyEvidence ? { morphology: morphologyEvidence } : {}),
  };

  if (isSemanticInterpretation(options.incomingSemanticInterpretation)) {
    const interpretation = normalizeSemanticInterpretation(options.incomingSemanticInterpretation, message);
    return buildResult(message, interpretation, entityResolution, {
      semanticSource: "client_shared",
      morphology,
      morphologyEvidence,
      morphologyProvider: morphologyProviderName,
      warnings,
    }, linguisticEvidence);
  }

  if (options.semanticProvider) {
    try {
      const provided = await options.semanticProvider.interpret({
        message,
        morphology,
        morphologyEvidence,
        context: options.context,
      });
      if (isSemanticInterpretation(provided)) {
        const interpretation = normalizeSemanticInterpretation(provided, message);
        return buildResult(message, interpretation, entityResolution, {
          semanticSource: "semantic_provider",
          semanticProvider: options.semanticProvider.name,
          morphology,
          morphologyEvidence,
          morphologyProvider: morphologyProviderName,
          warnings,
        }, linguisticEvidence);
      }
      warnings.push(`Semantic provider ${options.semanticProvider.name} returned an invalid SemanticInterpretation@2.`);
    } catch (error) {
      warnings.push(`Semantic provider ${options.semanticProvider.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const interpretation = interpretationFromRegexFloor(message);
  return buildResult(message, interpretation, entityResolution, {
    semanticSource: "fallback_regex",
    morphology,
    morphologyEvidence,
    morphologyProvider: morphologyProviderName,
    warnings,
  }, linguisticEvidence);
}