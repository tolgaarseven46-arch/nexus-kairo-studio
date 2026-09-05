import type { SemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities, type EntityResolutionResult } from "./entityResolutionEngine";
import { buildCanonicalWorldEvent, type CanonicalWorldEvent } from "./worldEventEngine";
import { isSemanticInterpretation, normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import type { SemanticInterpretation } from "../types/semanticInterpretation";

export type SemanticRelationshipScope = "kaira_user" | "third_party" | "event" | "unknown";
export type AppraisalSemanticEvent = SemanticEvent & {
  relationshipScope?: SemanticRelationshipScope;
  /** Read-only projection of the canonical interpretation uncertainty. */
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
export interface SemanticUnderstandingProvider {
  name: string;
  interpret(input: { message: string; morphology?: TurkishMorphologyResult; context?: LanguageUnderstandingContext }): Promise<SemanticInterpretation>;
}

export type LanguageUnderstandingSource = "client_shared" | "semantic_provider" | "fallback_regex";
export interface LanguageUnderstandingResult {
  /** Canonical immutable per-turn semantic truth. */
  interpretation: SemanticInterpretation;
  /** Deterministic compatibility/appraisal projection; never a second authority. */
  event: AppraisalSemanticEvent;
  entityResolution: EntityResolutionResult;
  worldEvent: CanonicalWorldEvent;
  semanticSource: LanguageUnderstandingSource;
  semanticProvider?: string;
  morphology?: TurkishMorphologyResult;
  morphologyProvider?: string;
  warnings: string[];
}
export interface LanguageUnderstandingOptions {
  incomingSemanticInterpretation?: unknown;
  morphologyProvider?: MorphologyProvider;
  semanticProvider?: SemanticUnderstandingProvider;
  context?: LanguageUnderstandingContext;
}

export function groundSemanticEventForAppraisal(
  message: string,
  event: SemanticEvent,
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
  if (explicitThirdPartyActor || explicitThirdPartyTarget || event.target === "third_party") relationshipScope = "third_party";
  else if (actorId === "current_user" && targetId === "kaira") relationshipScope = "kaira_user";
  else if (event.target === "kaira" && entityResolution.namedPeople.length === 0) relationshipScope = "kaira_user";
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
  if (interpretation.target !== "third_party") return interpretation;
  const explicitKairaReference = entityResolution.references.some((ref) =>
    (ref.role === "second_person" || ref.role === "character") &&
    ref.resolvedId === "kaira" &&
    ref.confidence >= 0.9
  );
  const explicitThirdPartyReference = entityResolution.references.some((ref) =>
    ref.role === "named_person" && ref.resolvedId !== "current_user" && ref.resolvedId !== "kaira"
  ) || entityResolution.namedPeople.length > 0;
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

function buildResult(
  message: string,
  interpretation: SemanticInterpretation,
  entityResolution: EntityResolutionResult,
  rest: Omit<LanguageUnderstandingResult, "interpretation" | "event" | "entityResolution" | "worldEvent">,
): LanguageUnderstandingResult {
  interpretation = reconcileSemanticTargetWithEntityResolution(interpretation, entityResolution);
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
    ...rest,
  };
}

/**
 * Single language-understanding gateway.
 * Normal path: LLM provider -> SemanticInterpretation@2.
 * Regex is legal only as an explicit provider-failure fallback, and it must emit
 * the same canonical schema. No downstream raw-text reparse is allowed.
 */
export async function understandTurkishMessage(
  message: string,
  options: LanguageUnderstandingOptions = {},
): Promise<LanguageUnderstandingResult> {
  const entityResolution = resolveMessageEntities(message, options.context);

  if (isSemanticInterpretation(options.incomingSemanticInterpretation)) {
    const interpretation = normalizeSemanticInterpretation(options.incomingSemanticInterpretation, message);
    return buildResult(message, interpretation, entityResolution, { semanticSource: "client_shared", warnings: [] });
  }

  const warnings: string[] = [];
  let morphology: TurkishMorphologyResult | undefined;
  if (options.morphologyProvider) {
    try { morphology = await options.morphologyProvider.analyze(message); }
    catch (error) {
      warnings.push(`Morphology provider ${options.morphologyProvider.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.semanticProvider) {
    try {
      const provided = await options.semanticProvider.interpret({ message, morphology, context: options.context });
      if (isSemanticInterpretation(provided)) {
        const interpretation = normalizeSemanticInterpretation(provided, message);
        return buildResult(message, interpretation, entityResolution, {
          semanticSource: "semantic_provider",
          semanticProvider: options.semanticProvider.name,
          morphology,
          morphologyProvider: options.morphologyProvider?.name,
          warnings,
        });
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
    morphologyProvider: options.morphologyProvider?.name,
    warnings,
  });
}
