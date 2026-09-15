import type { KairaFinalProviderPromptParts } from "./kairaFinalProviderPrompt";
import { auditKairaFinalProviderPrompt } from "./kairaPreAiAudit";

export type KairaPromptAuthorityClass =
  | "social_behavior_authority"
  | "epistemic_authority"
  | "identity_grounding"
  | "observational_evidence"
  | "how_style"
  | "mixed_unresolved"
  | "assembly_only";

export interface KairaPromptAuthorityBlock {
  id: keyof KairaFinalProviderPromptParts | string;
  authorityClass: KairaPromptAuthorityClass;
  content: string;
}

export interface KairaPromptAuthorityFinding {
  code: "prompt_block_authority_violation" | "prompt_block_authority_unresolved";
  severity: "violation" | "warning";
  blockId: string;
  authorityClass: KairaPromptAuthorityClass;
  reason: string;
}

const SOCIAL_MOVE_SELECTION_RE =
  /(?:en\s+doğal\s+tek\s+sosyal\s+hareketi\s+seç|sosyal\s+hareket(?:i|ini)\s+seç|(?:tepki|soru|görüş|şaka)[^\n]{0,80}(?:tepki|soru|görüş|şaka))/iu;

const NON_SOCIAL_BEHAVIOR_CLASSES = new Set<KairaPromptAuthorityClass>([
  "epistemic_authority",
  "identity_grounding",
  "observational_evidence",
  "how_style",
  "assembly_only",
]);

function blockContradictsQuestionPermission(block: KairaPromptAuthorityBlock): boolean {
  const snapshot = auditKairaFinalProviderPrompt({
    scenarioId: "AUTH_BLOCK",
    branchTrackType: "regression",
    userId: "preai_AUTH_BLOCK_run001",
    sessionId: "preai_session_AUTH_BLOCK_run001",
    expectedUserIdPrefix: "preai_",
    expectedSessionIdPrefix: "preai_session_",
    systemPrompt: block.content,
    messages: [{ role: "user", content: "tamam" }],
    responsePlan: {
      allowQuestion: false,
      allowAffection: false,
      allowAdvice: false,
      requiredContent: [],
      hardReasons: ["question_forbidden"],
      maxWords: 12,
      maxSentences: 1,
    },
  });
  return snapshot.invariantViolations.some(
    (item) => item.code === "prompt_instruction_contradiction",
  );
}

/**
 * Diagnostic-only Phase-1 authority checker.
 *
 * It does not mutate or reject production prompts yet. It makes typed block
 * authority inspectable and self-validates known #260/T3 shadow-authority
 * families while content cleanup remains in later owning-seam PRs.
 */
export function auditKairaPromptAuthorityBlocks(
  blocks: KairaPromptAuthorityBlock[],
): KairaPromptAuthorityFinding[] {
  const findings: KairaPromptAuthorityFinding[] = [];

  for (const block of blocks) {
    if (!block.content.trim()) continue;

    if (block.authorityClass === "mixed_unresolved") {
      findings.push({
        code: "prompt_block_authority_unresolved",
        severity: "warning",
        blockId: String(block.id),
        authorityClass: block.authorityClass,
        reason: "block is intentionally marked mixed/unresolved pending its owning-seam cleanup",
      });
      continue;
    }

    if (!NON_SOCIAL_BEHAVIOR_CLASSES.has(block.authorityClass)) continue;

    if (blockContradictsQuestionPermission(block)) {
      findings.push({
        code: "prompt_block_authority_violation",
        severity: "violation",
        blockId: String(block.id),
        authorityClass: block.authorityClass,
        reason: "non-social-behavior block authorizes a question under an effective allowQuestion=false probe",
      });
      continue;
    }

    if (SOCIAL_MOVE_SELECTION_RE.test(block.content)) {
      findings.push({
        code: "prompt_block_authority_violation",
        severity: "violation",
        blockId: String(block.id),
        authorityClass: block.authorityClass,
        reason: "non-social-behavior block selects a social dialogue move",
      });
    }
  }

  return findings;
}

/**
 * Typed inventory of the current production prompt parts. `mixed_unresolved`
 * is diagnostic metadata, not an excuse to move/clean content in this PR.
 */
export function classifyKairaFinalProviderPromptParts(
  parts: KairaFinalProviderPromptParts,
): KairaPromptAuthorityBlock[] {
  return [
    { id: "runtimeIdentityInstruction", authorityClass: "identity_grounding", content: parts.runtimeIdentityInstruction },
    { id: "speechIdentityInstruction", authorityClass: "how_style", content: parts.speechIdentityInstruction },
    { id: "languageStyleMemoryInstruction", authorityClass: "how_style", content: parts.languageStyleMemoryInstruction },
    { id: "dyadicLanguageAlignmentInstruction", authorityClass: "how_style", content: parts.dyadicLanguageAlignmentInstruction },
    { id: "socialStyle", authorityClass: "mixed_unresolved", content: parts.socialStyle },
    { id: "groundingInstruction", authorityClass: "mixed_unresolved", content: parts.groundingInstruction },
    { id: "activeParticipantInstruction", authorityClass: "identity_grounding", content: parts.activeParticipantInstruction },
    { id: "entityGroundingInstruction", authorityClass: "identity_grounding", content: parts.entityGroundingInstruction },
    { id: "worldEventInstruction", authorityClass: "observational_evidence", content: parts.worldEventInstruction },
    { id: "worldEventMemoryInstruction", authorityClass: "epistemic_authority", content: parts.worldEventMemoryInstruction },
    { id: "worldStateAppraisalInstruction", authorityClass: "epistemic_authority", content: parts.worldStateAppraisalInstruction },
    { id: "worldReasoningPolicyInstruction", authorityClass: "epistemic_authority", content: parts.worldReasoningPolicyInstruction },
    { id: "epistemicInstruction", authorityClass: "epistemic_authority", content: parts.epistemicInstruction },
    { id: "selfMemoryInstruction", authorityClass: "epistemic_authority", content: parts.selfMemoryInstruction },
    { id: "dialogueInstruction", authorityClass: "mixed_unresolved", content: parts.dialogueInstruction },
    { id: "discourseInstruction", authorityClass: "observational_evidence", content: parts.discourseInstruction },
    { id: "dialogueDecisionInstruction", authorityClass: "observational_evidence", content: parts.dialogueDecisionInstruction },
    { id: "responsePlanInstruction", authorityClass: "social_behavior_authority", content: parts.responsePlanInstruction },
    { id: "canonicalObservationalContext", authorityClass: "observational_evidence", content: parts.canonicalObservationalContext },
    { id: "sessionWorkingMemory", authorityClass: "observational_evidence", content: parts.sessionWorkingMemory },
    { id: "memoryContext", authorityClass: "observational_evidence", content: parts.memoryContext },
    { id: "tone", authorityClass: "how_style", content: parts.tone },
  ];
}
