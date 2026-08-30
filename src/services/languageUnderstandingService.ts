import {
  interpretSemanticEvent,
  type SemanticEvent,
} from "./semanticEventEngine";
import {
  isSemanticEvent,
  type SemanticEventSource,
} from "./semanticEventAuthority";
import {
  resolveMessageEntities,
  type EntityResolutionResult,
} from "./entityResolutionEngine";
import {
  buildCanonicalWorldEvent,
  type CanonicalWorldEvent,
} from "./worldEventEngine";

export type SemanticRelationshipScope =
  | "kaira_user"
  | "third_party"
  | "event"
  | "unknown";

export type AppraisalSemanticEvent = SemanticEvent & {
  relationshipScope?: SemanticRelationshipScope;
};

export interface TurkishMorphToken {
  surface: string;
  normalized?: string;
  lemma?: string;
  pos?: string;
  morphemes?: string[];
  confidence?: number;
}

export interface TurkishMorphologyResult {
  provider: string;
  normalizedText: string;
  tokens: TurkishMorphToken[];
}

export interface LanguageUnderstandingContext {
  recentMessages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  userName?: string;
  characterName?: string;
}

export interface MorphologyProvider {
  name: string;
  analyze(message: string): Promise<TurkishMorphologyResult>;
}

export interface SemanticUnderstandingProvider {
  name: string;
  interpret(input: {
    message: string;
    morphology?: TurkishMorphologyResult;
    context?: LanguageUnderstandingContext;
  }): Promise<SemanticEvent>;
}

export type LanguageUnderstandingSource =
  | SemanticEventSource
  | "semantic_provider"
  | "fallback_regex";

export interface LanguageUnderstandingResult {
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
  incomingSemanticEvent?: unknown;
  morphologyProvider?: MorphologyProvider;
  semanticProvider?: SemanticUnderstandingProvider;
  context?: LanguageUnderstandingContext;
}

/**
 * Producer -> appraisal seam.
 *
 * SemanticEvent.target alone cannot represent who caused an event. For
 * relationship appraisal, a user reporting an event about Ayşe/Merve must not
 * be treated as if the user performed that act toward Kaira. Entity/world-event
 * grounding therefore adds a conservative relationshipScope to the canonical
 * semantic event. Downstream KDM consumes this scope instead of re-parsing names.
 */
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

  const explicitThirdPartyActor =
    actorSource === "explicit_name" && actorId !== "current_user";
  const explicitThirdPartyTarget =
    targetSource === "explicit_name" &&
    targetId !== "current_user" &&
    targetId !== "kaira";

  if (explicitThirdPartyActor || explicitThirdPartyTarget || event.target === "third_party") {
    relationshipScope = "third_party";
  } else if (
    actorId === "current_user" && targetId === "kaira"
  ) {
    relationshipScope = "kaira_user";
  } else if (
    event.target === "kaira" && entityResolution.namedPeople.length === 0
  ) {
    relationshipScope = "kaira_user";
  } else if (event.target === "event") {
    relationshipScope = "event";
  }

  return {
    event: { ...event, relationshipScope },
    worldEvent,
  };
}

/**
 * Single language-understanding gateway for Kaira.
 *
 * Downstream KDM/appraisal/relationship layers should consume the returned
 * canonical SemanticEvent instead of re-parsing Turkish independently.
 * Entity resolution and a conservative canonical world event are produced
 * alongside that event so later layers can reason about who did what to whom
 * without inventing participants when the discourse is ambiguous.
 *
 * Provider priority:
 * 1) already validated incoming semantic event (shared authority)
 * 2) optional morphology provider (for example Zemberek)
 * 3) optional semantic provider (for example an LLM structured parser)
 * 4) legacy regex semantic engine as a safe fallback
 */
export async function understandTurkishMessage(
  message: string,
  options: LanguageUnderstandingOptions = {},
): Promise<LanguageUnderstandingResult> {
  const entityResolution = resolveMessageEntities(message, options.context);

  if (isSemanticEvent(options.incomingSemanticEvent)) {
    const grounded = groundSemanticEventForAppraisal(
      message,
      options.incomingSemanticEvent,
      entityResolution,
    );
    return {
      event: grounded.event,
      entityResolution,
      worldEvent: grounded.worldEvent,
      semanticSource: "client_shared",
      warnings: [],
    };
  }

  const warnings: string[] = [];
  let morphology: TurkishMorphologyResult | undefined;

  if (options.morphologyProvider) {
    try {
      morphology = await options.morphologyProvider.analyze(message);
    } catch (error) {
      warnings.push(
        `Morphology provider ${options.morphologyProvider.name} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (options.semanticProvider) {
    try {
      const event = await options.semanticProvider.interpret({
        message,
        morphology,
        context: options.context,
      });

      if (isSemanticEvent(event)) {
        const grounded = groundSemanticEventForAppraisal(
          message,
          event,
          entityResolution,
        );
        return {
          event: grounded.event,
          entityResolution,
          worldEvent: grounded.worldEvent,
          semanticSource: "semantic_provider",
          semanticProvider: options.semanticProvider.name,
          morphology,
          morphologyProvider: options.morphologyProvider?.name,
          warnings,
        };
      }

      warnings.push(
        `Semantic provider ${options.semanticProvider.name} returned an invalid SemanticEvent.`,
      );
    } catch (error) {
      warnings.push(
        `Semantic provider ${options.semanticProvider.name} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const fallbackEvent = interpretSemanticEvent(message);
  const grounded = groundSemanticEventForAppraisal(
    message,
    fallbackEvent,
    entityResolution,
  );
  return {
    event: grounded.event,
    entityResolution,
    worldEvent: grounded.worldEvent,
    semanticSource: "fallback_regex",
    morphology,
    morphologyProvider: options.morphologyProvider?.name,
    warnings,
  };
}
