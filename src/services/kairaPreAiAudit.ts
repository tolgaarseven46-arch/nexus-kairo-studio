export type KairaPreAiBranchTrackType = "regression" | "exploration";

export interface KairaPreAiConsumptionTraceEntry {
  canonicalField: string;
  consumer: string;
  consumed: boolean;
  value?: unknown;
  source?: string;
  note?: string;
}

export interface KairaPreAiFactProvenanceEntry {
  key: string;
  source: "current_turn" | "session_history" | "world_memory" | "self_memory" | "lived_memory" | "identity" | "unknown";
  grounded: boolean;
  confidence?: number;
  detail?: string;
}

export interface KairaPreAiSessionIsolationCheck {
  isolated: boolean;
  userId: string;
  sessionId: string;
  reasons: string[];
}

export type KairaPreAiClusterId = "A" | "B" | "C" | "D" | "E";

export interface KairaPreAiDetectorCoverageEntry {
  cluster: KairaPreAiClusterId;
  detector: string;
  active: boolean;
  observable: boolean;
  reason: string;
}

export interface KairaPreAiSelfEpistemicCheck {
  factualSelfClaimRequired: boolean;
  groundedProvenanceKey?: string | null;
  epistemicQualificationActive: boolean;
  groundedConfidence?: number | null;
  epistemicRefusalActive?: boolean;
}

export interface KairaPreAiSemanticCompletenessCheck {
  causeKnown?: boolean | null;
  selectedMove?: string | null;
  correctedFacts?: Array<{
    key: string;
    previousValue: unknown;
    currentValue: unknown;
    previousValueStillActive: boolean;
    supersededMarked: boolean;
  }>;
}

export interface KairaPreAiHowStateAlignmentCheck {
  internalReaction?: string | null;
  projectedRegister?: string | null;
  diverges: boolean;
  policyReason?: string | null;
}

export interface KairaPreAiRepairRecoveryCheck {
  repairProgressBefore: number;
  repairProgressAfter: number;
  repairAttempt: boolean;
  recoverySource?: string | null;
}

export interface KairaPreAiInvariantViolation {
  code:
    | "prompt_instruction_contradiction"
    | "prompt_fact_without_provenance"
    | "grounded_fact_blocked_by_epistemic_refusal"
    | "self_epistemic_grounding_gap"
    | "semantic_completeness_miss"
    | "corrected_fact_resurfaced"
    | "how_state_unexplained_divergence"
    | "repair_recovery_without_source"
    | "dialogue_obligation_plan_unrealizable"
    | "forbidden_required_content_conflict"
    | "prompt_budget_exceeded"
    | "session_isolation_failure";
  message: string;
}

export interface KairaPreAiAuditInput {
  scenarioId: string;
  branchTrackType: KairaPreAiBranchTrackType;
  userId: string;
  sessionId: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  responsePlan: {
    allowQuestion: boolean;
    allowAffection: boolean;
    allowAdvice: boolean;
    requiredContent: string[];
    hardReasons: string[];
    maxWords: number;
    maxSentences: number;
  };
  dialogueObligation?: {
    type?: string;
    allowedResolutions?: string[];
  } | null;
  factProvenance?: KairaPreAiFactProvenanceEntry[];
  consumptionTrace?: KairaPreAiConsumptionTraceEntry[];
  selfEpistemic?: KairaPreAiSelfEpistemicCheck | null;
  semanticCompleteness?: KairaPreAiSemanticCompletenessCheck | null;
  howStateAlignment?: KairaPreAiHowStateAlignmentCheck | null;
  repairRecovery?: KairaPreAiRepairRecoveryCheck | null;
  detectorCoverage?: KairaPreAiDetectorCoverageEntry[];
  expectedUserIdPrefix?: string;
  expectedSessionIdPrefix?: string;
  maxPromptChars?: number;
}

export interface KairaPreAiAuditSnapshot {
  scenarioId: string;
  branchTrackType: KairaPreAiBranchTrackType;
  finalPromptSnapshot: {
    system: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    charCount: number;
  };
  consumptionTrace: KairaPreAiConsumptionTraceEntry[];
  factProvenance: KairaPreAiFactProvenanceEntry[];
  activeObligations: string[];
  permissionRealizability: {
    realizable: boolean;
    reasons: string[];
  };
  detectorCoverage: KairaPreAiDetectorCoverageEntry[];
  sessionIsolationCheck: KairaPreAiSessionIsolationCheck;
  invariantViolations: KairaPreAiInvariantViolation[];
  noAiStopMarker: "FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL";
}

function obligationRealizability(input: KairaPreAiAuditInput) {
  const allowed = input.dialogueObligation?.allowedResolutions ?? [];
  if (!allowed.length) return { realizable: true, reasons: ["no_active_resolution_constraint"] };

  const reasons: string[] = [];
  const realizable = allowed.some((resolution) => {
    if (resolution === "clarify") {
      if (input.responsePlan.allowQuestion) return true;
      reasons.push("clarify_requires_question_permission");
      return false;
    }
    if (resolution === "advise") {
      if (input.responsePlan.allowAdvice) return true;
      reasons.push("advise_requires_advice_permission");
      return false;
    }
    return true;
  });
  return { realizable, reasons: realizable ? ["at_least_one_allowed_resolution_is_realizable"] : reasons };
}

function sessionIsolation(input: KairaPreAiAuditInput): KairaPreAiSessionIsolationCheck {
  const reasons: string[] = [];
  if (input.expectedUserIdPrefix && !input.userId.startsWith(input.expectedUserIdPrefix)) {
    reasons.push("user_id_outside_scenario_namespace");
  }
  if (input.expectedSessionIdPrefix && !input.sessionId.startsWith(input.expectedSessionIdPrefix)) {
    reasons.push("session_id_outside_scenario_namespace");
  }
  if (!input.userId.includes(input.scenarioId)) reasons.push("user_id_not_scenario_unique");
  if (!input.sessionId.includes(input.scenarioId)) reasons.push("session_id_not_scenario_unique");
  return { isolated: reasons.length === 0, userId: input.userId, sessionId: input.sessionId, reasons };
}

function defaultCoverage(input: KairaPreAiAuditInput): KairaPreAiDetectorCoverageEntry[] {
  return [
    {
      cluster: "A",
      detector: "self_epistemic_provenance",
      active: Boolean(input.selfEpistemic),
      observable: Boolean(input.selfEpistemic),
      reason: input.selfEpistemic ? "typed_self_epistemic_snapshot_available" : "typed_self_epistemic_snapshot_missing",
    },
    {
      cluster: "B",
      detector: "semantic_completeness_and_correction",
      active: Boolean(input.semanticCompleteness),
      observable: input.semanticCompleteness?.causeKnown != null || Boolean(input.semanticCompleteness?.correctedFacts?.length),
      reason: input.semanticCompleteness
        ? "typed_completeness_snapshot_partially_or_fully_available"
        : "canonical_causeKnown_or_correction_snapshot_missing",
    },
    {
      cluster: "C",
      detector: "effective_permission_prompt_reconciliation",
      active: true,
      observable: true,
      reason: "response_plan_and_final_prompt_available",
    },
    {
      cluster: "D",
      detector: "how_state_explained_divergence",
      active: Boolean(input.howStateAlignment),
      observable: Boolean(input.howStateAlignment),
      reason: input.howStateAlignment ? "typed_alignment_snapshot_available" : "typed_alignment_snapshot_missing",
    },
    {
      cluster: "E",
      detector: "repair_recovery_provenance",
      active: Boolean(input.repairRecovery),
      observable: Boolean(input.repairRecovery),
      reason: input.repairRecovery ? "typed_repair_recovery_snapshot_available" : "typed_repair_recovery_snapshot_missing",
    },
  ];
}

function realizerInstructionSurface(systemPrompt: string) {
  return systemPrompt
    .split("\n")
    .filter((line) => !/^\s*DEBUG_ONLY\b/iu.test(line))
    .join("\n");
}

export function auditKairaFinalProviderPrompt(input: KairaPreAiAuditInput): KairaPreAiAuditSnapshot {
  const violations: KairaPreAiInvariantViolation[] = [];
  const realizability = obligationRealizability(input);
  const isolation = sessionIsolation(input);
  const promptChars = input.systemPrompt.length + input.messages.reduce((sum, item) => sum + item.content.length, 0);
  const coverage = input.detectorCoverage ?? defaultCoverage(input);

  if (!realizability.realizable) {
    violations.push({
      code: "dialogue_obligation_plan_unrealizable",
      message: realizability.reasons.join("; "),
    });
  }

  if (!isolation.isolated) {
    violations.push({
      code: "session_isolation_failure",
      message: isolation.reasons.join("; "),
    });
  }

  const required = new Set(input.responsePlan.requiredContent);
  const hard = new Set(input.responsePlan.hardReasons);
  const conflicts: Array<[string, string]> = [
    ["ask_follow_up", "question_forbidden"],
    ["give_advice", "unsolicited_advice_forbidden"],
    ["counter_flirt", "flirtation_forbidden_by_character_policy"],
  ];
  for (const [need, forbid] of conflicts) {
    if (required.has(need) && hard.has(forbid)) {
      violations.push({
        code: "forbidden_required_content_conflict",
        message: `${need} is required while ${forbid} is active`,
      });
    }
  }

  // General C-family detector: every realizer-facing question authorization is
  // checked against the effective hard permission. DEBUG_ONLY metadata is kept
  // for diagnostics but deliberately excluded from the instruction surface.
  const realizerSurface = realizerInstructionSurface(input.systemPrompt);
  if (!input.responsePlan.allowQuestion && /(?:soru sor\b|sorabilirsin|clarify|netleştir)/iu.test(realizerSurface)) {
    const explicitOverride = /clarification-question-authorized-by-obligation|obligation-owned clarification/iu.test(realizerSurface);
    if (!explicitOverride) {
      violations.push({
        code: "prompt_instruction_contradiction",
        message: "allowQuestion=false but the final provider prompt still authorizes a question without an obligation override",
      });
    }
  }

  for (const fact of input.factProvenance ?? []) {
    if (!fact.grounded || fact.source === "unknown") {
      violations.push({
        code: "prompt_fact_without_provenance",
        message: `fact ${fact.key} has no grounded provenance`,
      });
    }
  }

  if (input.selfEpistemic?.factualSelfClaimRequired) {
    const provenance = input.selfEpistemic.groundedProvenanceKey
      ? (input.factProvenance ?? []).find((fact) => fact.key === input.selfEpistemic?.groundedProvenanceKey)
      : null;
    const grounded = Boolean(provenance?.grounded) || Number(input.selfEpistemic.groundedConfidence ?? 0) >= 0.72;
    if (!grounded && !input.selfEpistemic.epistemicQualificationActive) {
      violations.push({
        code: "self_epistemic_grounding_gap",
        message: "a factual Kaira self-claim is required but neither grounded provenance nor an epistemic qualification is active",
      });
    }
    if (grounded && input.selfEpistemic.epistemicRefusalActive) {
      violations.push({
        code: "grounded_fact_blocked_by_epistemic_refusal",
        message: "grounded self evidence is available but an epistemic refusal is still active",
      });
    }
  }

  const completeness = input.semanticCompleteness;
  if (completeness?.causeKnown === true && /^(?:clarify|invite_emotional_context|invite_context)$/iu.test(String(completeness.selectedMove ?? ""))) {
    violations.push({
      code: "semantic_completeness_miss",
      message: `causeKnown=true but dialogue move ${completeness.selectedMove} still requests context`,
    });
  }
  for (const corrected of completeness?.correctedFacts ?? []) {
    if (corrected.previousValueStillActive && !corrected.supersededMarked) {
      violations.push({
        code: "corrected_fact_resurfaced",
        message: `corrected fact ${corrected.key} still exposes the previous value without a superseded marker`,
      });
    }
  }

  if (input.howStateAlignment?.diverges && !input.howStateAlignment.policyReason?.trim()) {
    violations.push({
      code: "how_state_unexplained_divergence",
      message: `internal reaction ${input.howStateAlignment.internalReaction ?? "unknown"} diverges from projected register ${input.howStateAlignment.projectedRegister ?? "unknown"} without an explicit policy reason`,
    });
  }

  if (input.repairRecovery && input.repairRecovery.repairProgressAfter > input.repairRecovery.repairProgressBefore) {
    if (!input.repairRecovery.repairAttempt && !input.repairRecovery.recoverySource?.trim()) {
      violations.push({
        code: "repair_recovery_without_source",
        message: "repair/recovery progress increased without repairAttempt or an explicit recoverySource",
      });
    }
  }

  if (promptChars > (input.maxPromptChars ?? 32_000)) {
    violations.push({
      code: "prompt_budget_exceeded",
      message: `final provider prompt is ${promptChars} chars`,
    });
  }

  return {
    scenarioId: input.scenarioId,
    branchTrackType: input.branchTrackType,
    finalPromptSnapshot: { system: input.systemPrompt, messages: input.messages, charCount: promptChars },
    consumptionTrace: input.consumptionTrace ?? [],
    factProvenance: input.factProvenance ?? [],
    activeObligations: input.dialogueObligation?.type ? [input.dialogueObligation.type] : [],
    permissionRealizability: realizability,
    detectorCoverage: coverage,
    sessionIsolationCheck: isolation,
    invariantViolations: violations,
    noAiStopMarker: "FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL",
  };
}
