import {
  understandTurkishMessage,
  type LanguageUnderstandingContext,
  type LanguageUnderstandingResult,
} from "./languageUnderstandingService";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { createConfiguredZemberekMorphologyProvider } from "./zemberekMorphologyProvider";

export interface ServerSemanticGenerateText {
  (
    system: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    temperature: number,
    preferredProvider: string,
  ): Promise<string>;
}

export interface ResolveServerLanguageUnderstandingInput {
  message: string;
  incomingSemanticEvent?: unknown;
  context?: LanguageUnderstandingContext;
  preferredProvider: string;
  generateText: ServerSemanticGenerateText;
}

/**
 * Server-facing bridge.
 *
 * This keeps model-provider details outside the language-understanding service.
 * It can be called once at the /api/chat trust boundary, then the returned
 * canonical SemanticEvent should be shared with all KDM/appraisal consumers.
 */
export async function resolveServerLanguageUnderstanding(
  input: ResolveServerLanguageUnderstandingInput,
): Promise<LanguageUnderstandingResult> {
  const morphologyProvider = createConfiguredZemberekMorphologyProvider();
  const semanticProvider = createLlmSemanticUnderstandingProvider({
    name: `llm_semantic_${input.preferredProvider}`,
    generate: ({ system, prompt, temperature }) =>
      input.generateText(
        system,
        [{ role: "user", content: prompt }],
        temperature,
        input.preferredProvider,
      ),
  });

  return understandTurkishMessage(input.message, {
    incomingSemanticEvent: input.incomingSemanticEvent,
    morphologyProvider,
    semanticProvider,
    context: input.context,
  });
}
