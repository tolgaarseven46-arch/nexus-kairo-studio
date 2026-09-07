export type KairaPreAiBranchTrackType = "regression" | "exploration";

export interface KairaPreAiConsumptionTraceEntry {
  canonicalField: string;
  consumer: string;
  consumed: boolean;
  note?: string;
}

export interface KairaPreAiFactProvenanceEntry {
  key: string;
  source: "current_turn" | "session_history" | "world_memory" | "self_memory" | "lived_memory" | "identity" | "unknown";
  grounded: boolean;
  detail?: string;
}

export interface KairaPreAiSessionIsolationCheck {
  isolated: boolean;
  userId: string;
  sessionId: string;
  reasons: string[];
}

export interface KairaPreAiInvariantViolation {
  code:
    | "prompt_instruction_contradiction"
    | "prompt_fact_without_provenance"
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

export function auditKairaFinalProviderPrompt(input: KairaPreAiAuditInput): KairaPreAiAuditSnapshot {
  const violations: KairaPreAiInvariantViolation[] = [];
  const realizability = obligationRealizability(input);
  const isolation = sessionIsolation(input);
  const promptChars = input.systemPrompt.length + input.messages.reduce((sum, item) => sum + item.content.length, 0);

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

  if (!input.responsePlan.allowQuestion && /(?:soru sor|sorabilirsin|clarify|netleştir)/iu.test(input.systemPrompt)) {
    const explicitOverride = /clarification-question-authorized-by-obligation|obligation-owned clarification/iu.test(input.systemPrompt);
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
    sessionIsolationCheck: isolation,
    invariantViolations: violations,
    noAiStopMarker: "FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL",
  };
}
