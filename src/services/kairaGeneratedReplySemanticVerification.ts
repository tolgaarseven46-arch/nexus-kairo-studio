import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  resolveServerLanguageUnderstanding,
  type ServerSemanticGenerateText,
} from "./serverLanguageUnderstanding";

export interface GeneratedReplySemanticVerificationInput {
  reply: string;
  plan: KairaResponsePlan;
  preferredProvider: string;
  generateText: ServerSemanticGenerateText;
}

/**
 * Reuses the canonical SemanticInterpretation@2 authority to interpret a
 * generated reply only when provenance verification is actually required.
 * No raw-text regex verifier is introduced at delivery time.
 */
export async function resolveGeneratedReplySemanticVerification(
  input: GeneratedReplySemanticVerificationInput,
): Promise<SemanticInterpretation | null> {
  if (!input.plan.requiredContent?.includes("engage_user_content")) return null;
  const reply = String(input.reply ?? "").trim();
  if (!reply) return null;

  const resolved = await resolveServerLanguageUnderstanding({
    message: reply,
    preferredProvider: input.preferredProvider,
    generateText: input.generateText,
  });
  return resolved.interpretation;
}
