import { understandTurkishMessage } from "./languageUnderstandingService";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { buildBehaviorContract } from "./behaviorContract";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";
import { deriveDiscourseState, buildDiscourseObservationalInstruction } from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { computeKairoSpeechIdentity, speechIdentityPrompt } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import {
  buildCanonicalBehaviorBlock,
  buildCanonicalDialogueMoveContext,
  buildCanonicalObservationalContext,
} from "./kairaCanonicalPromptBuilder";
import { buildKairaFinalProviderSystemPrompt } from "./kairaFinalProviderPrompt";
import { auditKairaFinalProviderPrompt, type KairaPreAiAuditSnapshot } from "./kairaPreAiAudit";
import type { DroitDynamicState } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";

export interface KairaPreAiScenarioDefinition {
  scenarioId: string;
  cluster: string;
  branchTrackType: "regression" | "exploration";
  title: string;
  messages: string[];
  invariants: string[];
  failureClasses: string[];
}

export interface KairaPreAiScenarioTurnResult {
  scenarioId: string;
  turnNumber: number;
  userMessage: string;
  semanticSource: string;
  interpretation: SemanticInterpretation;
  semanticEvent: any;
  entityResolution: any;
  worldEvent: any;
  dynamicStateBefore: DroitDynamicState;
  dynamicStateAfter: DroitDynamicState;
  dialogueDecision: any;
  responsePlan: any;
  speechIdentity: any;
  audit: KairaPreAiAuditSnapshot;
}

export interface KairaPreAiScenarioResult {
  scenarioId: string;
  cluster: string;
  title: string;
  branchTrackType: "regression" | "exploration";
  userId: string;
  sessionId: string;
  turns: KairaPreAiScenarioTurnResult[];
  failureClassCounts: Record<string, number>;
  toolingNotes: string[];
}

const DEFAULT_STATE: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};

function coreConsumptionTrace(event: any) {
  return [
    { canonicalField: "primaryIntent", consumer: "kdmConsistencyEngine", consumed: true },
    { canonicalField: "target", consumer: "entity/world grounding", consumed: true },
    { canonicalField: "discourseFacets", consumer: "discourseStateReducer", consumed: true },
    { canonicalField: "discourseFacets", consumer: "kairoDialogueDecisionEngine", consumed: true },
    { canonicalField: "severity", consumer: "kdmRelationshipReducerBridge", consumed: true },
    { canonicalField: "jokingConfidence", consumer: "kdmRelationshipReducerBridge", consumed: true },
    { canonicalField: "sincerityConfidence", consumer: "kdmRelationshipReducerBridge", consumed: true },
    { canonicalField: "uncertainty", consumer: "kdmRelationshipReducerBridge", consumed: true },
    { canonicalField: "worldMemory", consumer: "preai_core_harness", consumed: Boolean(event.worldMemory) },
  ];
}

function promptFactProvenance(event: any) {
  return (event.worldMemory?.claims ?? []).map((claim: any, index: number) => ({
    key: `${claim.subjectId}.${claim.attributeKey}.${index}`,
    source: "current_turn" as const,
    grounded: true,
    detail: `confidence=${Number(claim.confidence ?? 0).toFixed(2)}`,
  }));
}

function buildCoreFinalProviderPrompt(input: {
  responsePlan: any;
  speech: any;
  discourse: any;
  dialogueDecision: any;
  trace: any;
  dynamicState: DroitDynamicState;
  interpretation: SemanticInterpretation;
  entityResolution: any;
  worldEvent: any;
  userMessage: string;
}) {
  const relationship = input.trace.relationship;
  const observational = buildCanonicalObservationalContext({
    intent: input.trace.messageInterpretation.intent,
    sentiment: input.trace.messageInterpretation.sentiment,
    warmth: relationship.warmthScore,
    trust: relationship.trustScore ?? 50,
    conflict: relationship.conflictScore ?? 0,
    hurt: relationship.hurtScore ?? 0,
    reactionMode: input.dynamicState.reactionMode ?? null,
  });

  // The Phase 0 harness now uses the exact same final-provider serializer as
  // production. It still supplies a deterministic context subset because Phase 0
  // intentionally does not hydrate provider-dependent/persistent production
  // services. Assembly parity and context fidelity are reported separately.
  return buildKairaFinalProviderSystemPrompt({
    runtimeIdentityInstruction: "=== PRE-AI PRODUCTION-CORE PROMPT SNAPSHOT ===\nSTOP: FINAL PROVIDER PROMPT BOUNDARY / NO MODEL CALL",
    speechIdentityInstruction: speechIdentityPrompt(input.speech),
    languageStyleMemoryInstruction: "",
    dyadicLanguageAlignmentInstruction: "",
    socialStyle: "",
    groundingInstruction: `CANONICAL SEMANTIC SNAPSHOT:\n${JSON.stringify(input.interpretation)}`,
    activeParticipantInstruction: "",
    entityGroundingInstruction: `ENTITY RESOLUTION SNAPSHOT:\n${JSON.stringify(input.entityResolution)}`,
    worldEventInstruction: `WORLD EVENT SNAPSHOT:\n${JSON.stringify(input.worldEvent)}`,
    worldEventMemoryInstruction: "",
    worldStateAppraisalInstruction: "",
    worldReasoningPolicyInstruction: "",
    epistemicInstruction: "",
    selfMemoryInstruction: "",
    dialogueInstruction: `CURRENT USER TURN: ${input.userMessage}`,
    discourseInstruction: buildDiscourseObservationalInstruction(input.discourse),
    dialogueDecisionInstruction: buildCanonicalDialogueMoveContext(
      input.dialogueDecision.move,
      input.dialogueDecision.target,
      input.dialogueDecision.reason,
    ),
    responsePlanInstruction: buildCanonicalBehaviorBlock(input.responsePlan),
    canonicalObservationalContext: observational,
    sessionWorkingMemory: "Phase 0 user-turn-only history; generation is intentionally disabled.",
    memoryContext: "Phase 0 persistent-memory hydration disabled.",
    tone: input.trace?.decision?.chosenTone || "confident",
  });
}

/**
 * Deterministic Phase-0 harness.
 *
 * No morphology/semantic/model provider is supplied to understandTurkishMessage,
 * so ingestion uses the repository's explicit deterministic regex-floor fallback.
 * This deliberately audits the no-AI core/composition path. It MUST NOT be used
 * as evidence about semantic-provider quality. Production and the harness share
 * the same final-provider serializer; production-context fidelity remains a
 * separate, explicit coverage dimension.
 */
export async function runKairaPreAiPhase0Scenario(
  scenario: KairaPreAiScenarioDefinition,
  runId = "run001",
): Promise<KairaPreAiScenarioResult> {
  const userId = `preai_${scenario.scenarioId}_${runId}`;
  const sessionId = `preai_session_${scenario.scenarioId}_${runId}`;
  const personality = normalizeDroitPersonality(null);
  let dynamicState: DroitDynamicState = { ...DEFAULT_STATE };
  const history: Array<{ sender: string; text: string; semanticInterpretation?: SemanticInterpretation }> = [];
  const turns: KairaPreAiScenarioTurnResult[] = [];
  const failureClassCounts: Record<string, number> = {};

  for (let index = 0; index < scenario.messages.length; index += 1) {
    const userMessage = scenario.messages[index];
    const language = await understandTurkishMessage(userMessage, {
      context: {
        userName: "Mert",
        characterName: "KAIRO",
        recentMessages: history.slice(-8).map((item) => ({
          role: item.sender === "user" ? "user" as const : "assistant" as const,
          content: item.text,
        })),
      },
    });
    const before = dynamicState;
    const dialogueAnalysis = projectSemanticEventToDialogueAnalysis(language.event);
    const discourse = deriveDiscourseState(history, { message: userMessage, event: language.event });
    const dialogueDecision = planDialogueResponse(
      history as any,
      userMessage,
      "Mert",
      language.event,
      dialogueAnalysis,
      discourse,
    );
    const kdm = analyzeKdmInteractionCanonicalTurn(
      userMessage,
      personality,
      dynamicState,
      language.interpretation,
      language.event,
      null,
      null,
    );
    dynamicState = kdm.nextDynamicState;
    const contract = buildBehaviorContract(dynamicState, kdm.trace, language.event);
    const speech = computeKairoSpeechIdentity(personality, dynamicState, kdm.trace);
    const responsePlan = buildKairaResponsePlan(contract, dialogueDecision, speech);
    const systemPrompt = buildCoreFinalProviderPrompt({
      responsePlan,
      speech,
      discourse,
      dialogueDecision,
      trace: kdm.trace,
      dynamicState,
      interpretation: language.interpretation,
      entityResolution: language.entityResolution,
      worldEvent: language.worldEvent,
      userMessage,
    });
    const audit = auditKairaFinalProviderPrompt({
      scenarioId: scenario.scenarioId,
      branchTrackType: scenario.branchTrackType,
      userId,
      sessionId,
      expectedUserIdPrefix: "preai_",
      expectedSessionIdPrefix: "preai_session_",
      systemPrompt,
      messages: [{ role: "user", content: `[Mert]: ${userMessage}` }],
      responsePlan: {
        allowQuestion: responsePlan.allowQuestion,
        allowAffection: responsePlan.allowAffection,
        allowAdvice: responsePlan.allowAdvice === true,
        requiredContent: responsePlan.requiredContent ?? [],
        hardReasons: responsePlan.hardReasons ?? [],
        maxWords: responsePlan.maxWords,
        maxSentences: responsePlan.maxSentences,
      },
      dialogueObligation: dialogueDecision.obligation
        ? {
            type: dialogueDecision.obligation.type,
            allowedResolutions: dialogueDecision.obligation.satisfactionCriteria.allowedResolutions,
          }
        : null,
      factProvenance: promptFactProvenance(language.event),
      consumptionTrace: coreConsumptionTrace(language.event),
    });

    for (const violation of audit.invariantViolations) {
      failureClassCounts[violation.code] = (failureClassCounts[violation.code] ?? 0) + 1;
    }

    turns.push({
      scenarioId: scenario.scenarioId,
      turnNumber: index + 1,
      userMessage,
      semanticSource: language.semanticSource,
      interpretation: language.interpretation,
      semanticEvent: language.event,
      entityResolution: language.entityResolution,
      worldEvent: language.worldEvent,
      dynamicStateBefore: before,
      dynamicStateAfter: dynamicState,
      dialogueDecision,
      responsePlan,
      speechIdentity: speech,
      audit,
    });

    // Phase 0 stops before provider generation, so no assistant text is invented.
    // Persist the canonical user turn only; exact reply-dependent discourse belongs
    // to the later generation phase / captured replay tracks.
    history.push({ sender: "user", text: userMessage, semanticInterpretation: language.interpretation });
  }

  return {
    scenarioId: scenario.scenarioId,
    cluster: scenario.cluster,
    title: scenario.title,
    branchTrackType: scenario.branchTrackType,
    userId,
    sessionId,
    turns,
    failureClassCounts,
    toolingNotes: [
      "no_ai_provider_called",
      "semantic_ingestion=deterministic_regex_floor",
      "history_fidelity=user_turns_only_until_generation_phase",
      "prompt_assembly=shared_production_final_provider_serializer",
      "prompt_context_fidelity=deterministic_phase0_subset_not_full_production_runtime",
    ],
  };
}
