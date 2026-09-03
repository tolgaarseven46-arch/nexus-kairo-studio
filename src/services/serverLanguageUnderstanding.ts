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
  incomingSemanticInterpretation?: unknown;
  context?: LanguageUnderstandingContext;
  preferredProvider: string;
  generateText: ServerSemanticGenerateText;
}

/** Server bridge: canonical authority is SemanticInterpretation@2. */
export async function resolveServerLanguageUnderstanding(
  input: ResolveServerLanguageUnderstandingInput,
): Promise<LanguageUnderstandingResult> {
  const morphologyProvider = createConfiguredZemberekMorphologyProvider();
  const semanticProvider = createLlmSemanticUnderstandingProvider({
    name: `llm_semantic_${input.preferredProvider}`,
    generate: ({ system, prompt, temperature }) =>
      input.generateText(system, [{ role: "user", content: prompt }], temperature, input.preferredProvider),
  });

  return understandTurkishMessage(input.message, {
    incomingSemanticInterpretation: input.incomingSemanticInterpretation,
    morphologyProvider,
    semanticProvider,
    context: input.context,
  });
}
