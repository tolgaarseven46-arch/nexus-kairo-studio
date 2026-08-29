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
  event: SemanticEvent;
  entityResolution: EntityResolutionResult;
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
 * Single language-understanding gateway for Kaira.
 *
 * Downstream KDM/appraisal/relationship layers should consume the returned
 * canonical SemanticEvent instead of re-parsing Turkish independently.
 * Entity resolution is produced alongside that event so the world-model layer
 * can reason about discourse participants without changing KDM math yet.
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
    return {
      event: options.incomingSemanticEvent,
      entityResolution,
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
        return {
          event,
          entityResolution,
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

  return {
    event: interpretSemanticEvent(message),
    entityResolution,
    semanticSource: "fallback_regex",
    morphology,
    morphologyProvider: options.morphologyProvider?.name,
    warnings,
  };
}
