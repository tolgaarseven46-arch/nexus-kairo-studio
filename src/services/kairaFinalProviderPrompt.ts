export interface KairaFinalProviderPromptParts {
  runtimeIdentityInstruction: string;
  speechIdentityInstruction: string;
  languageStyleMemoryInstruction: string;
  dyadicLanguageAlignmentInstruction: string;
  socialStyle: string;
  groundingInstruction: string;
  activeParticipantInstruction: string;
  entityGroundingInstruction: string;
  worldEventInstruction: string;
  worldEventMemoryInstruction: string;
  worldStateAppraisalInstruction: string;
  worldReasoningPolicyInstruction: string;
  epistemicInstruction: string;
  selfMemoryInstruction: string;
  dialogueInstruction: string;
  discourseInstruction: string;
  dialogueDecisionInstruction: string;
  responsePlanInstruction: string;
  canonicalObservationalContext: string;
  sessionWorkingMemory: string;
  memoryContext: string;
  tone: string;
}

/**
 * Exact production system-prompt serializer for the Kaira provider boundary.
 *
 * IMPORTANT: This function owns assembly only. Upstream services remain owners
 * of the individual typed/observational blocks. Debug/KNT metadata must not be
 * added here as a second realizer authority.
 *
 * The historical production template intentionally has no separator between
 * languageStyleMemoryInstruction and dyadicLanguageAlignmentInstruction because
 * server.ts used a template-literal line continuation there. Preserve that byte
 * behavior until a separately reviewed prompt-format migration changes it.
 */
export function buildKairaFinalProviderSystemPrompt(parts: KairaFinalProviderPromptParts): string {
  return `${parts.runtimeIdentityInstruction}\n${parts.speechIdentityInstruction}\n${parts.languageStyleMemoryInstruction}${parts.dyadicLanguageAlignmentInstruction}\n${parts.socialStyle}\n${parts.groundingInstruction}\n${parts.activeParticipantInstruction}\n${parts.entityGroundingInstruction}\n${parts.worldEventInstruction}\n${parts.worldEventMemoryInstruction}\n${parts.worldStateAppraisalInstruction}\n${parts.worldReasoningPolicyInstruction}\n${parts.epistemicInstruction}\n${parts.selfMemoryInstruction}\n${parts.dialogueInstruction}\n${parts.discourseInstruction}\n${parts.dialogueDecisionInstruction}\n${parts.responsePlanInstruction}\n${parts.canonicalObservationalContext}\nAYNI OTURUM ÇALIŞMA HAFIZASI (yüksek güven):\n${parts.sessionWorkingMemory}\nDOĞRULANMIŞ GEÇMİŞ HAFIZA:\n${parts.memoryContext}\nTon:${parts.tone || "confident"}. Yalnızca Kaira'nın göndereceği doğal Türkçe mesajı üret; açıklama veya analiz ekleme.`;
}
