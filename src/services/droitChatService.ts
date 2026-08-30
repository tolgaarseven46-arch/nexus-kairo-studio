import {
  DroitPersonalityTraits,
  TestMessage,
  DroitDynamicState,
  ReasoningTrace,
} from "../types/nexus";
import { computeBehaviorProfile, BehaviorLayerProfile } from "./droitBehaviorEngine";
import { validateKairoResponse, ResponseConsistencyResult } from "./kairoResponseConsistency";
import { appraiseEventV0, type AppraisalEventKind } from "./appraisalEngine";
import { computeTemperamentResponse, temperamentFromFineTune } from "./temperamentEngine";
import { applyPersonalityTendencies } from "./personalityTendencyEngine";
import { applyMotivations } from "./motivationEngine";
import { applyValues } from "./valueEngine";
import { applyPreferences } from "./preferenceEngine";
import { applySocialOrientation } from "./socialOrientationEngine";
import { applyBoundaries } from "./boundaryEngine";
import { applyExpressionStyle } from "./expressionStyleEngine";
import { integrateBehaviorLayers } from "./behaviorIntegrationEngine";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";
import { saveTestSessionLayerAudit } from "./testSessionLayerAuditService";
import { auth } from "../lib/firebase";
import { requestCanonicalLanguageUnderstanding, type ClientLanguageUnderstandingResult } from "./clientLanguageUnderstanding";
import { resolveKairaInstanceContext, type KairaInstanceType } from "./kairaInstanceContext";

export type KairoProvider = "gemini" | "openrouter";
export type KairoProviderUsed = KairoProvider | "local_language";

export interface KairoTimingMetrics {
  clientPrepMs: number;
  serverTotalMs: number;
  memoryMs: number;
  kdmMs: number;
  aiMs: number;
  postProcessMs: number;
  networkAndOverheadMs: number;
  totalMs: number;
}

export interface SendKairoChatOptions {
  userMessage: string;
  personality: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  history?: TestMessage[];
  characterInfo?: { name?: string; roleTitle?: string; raceName?: string };
  provider?: KairoProvider;
  userId?: string;
  userName?: string;
  suppressRecentMemory?: boolean;
  sessionId?: string;
  kairaInstanceId?: string;
  kairaInstanceType?: KairaInstanceType;
}

export interface KairoChatResponse {
  reply: string;
  profile: BehaviorLayerProfile;
  dynamicState?: DroitDynamicState;
  reasoningTrace?: ReasoningTrace;
  consistency?: ResponseConsistencyResult;
  providerUsed?: KairoProviderUsed;
  timings?: KairoTimingMetrics;
  sessionId?: string;
  turnId?: string;
  kairaInstanceId?: string;
  kairaInstanceType?: KairaInstanceType;
  languageUnderstanding?: ClientLanguageUnderstandingResult;
  worldStateAppraisal?: unknown;
  worldReasoningPolicy?: unknown;
  worldMemoryGuard?: unknown;
  responsePlan?: unknown;
}

function resolveConversationUserId(explicitUserId?: string) {
  if (explicitUserId?.trim()) return explicitUserId.trim();
  if (typeof window !== "undefined") {
    const id = window.localStorage.getItem("kairo_test_user_id");
    if (id?.trim()) return id.trim();
  }
  return auth.currentUser?.uid || "anonymous";
}

function freshSessionId(userId: string, instanceId: string) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeInstanceId = instanceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const random = Math.random().toString(36).slice(2, 8);
  return `session_${safeUserId}_${safeInstanceId}_${Date.now()}_${random}`;
}

const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function readFineTuneProfile(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("kairo_character_finetune_v2");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function appraisalEventFromSemantic(event: SemanticEvent): {
  kind: AppraisalEventKind;
  valence: "positive" | "negative" | "neutral";
  negativeLoad: number;
  frustrationLoad: number;
  threatLoad: number;
  rewardLoad: number;
} {
  let kind: AppraisalEventKind = "neutral";
  if (event.apology) kind = "apology";
  else if (event.insult) kind = "insult";
  else if (event.intent === "rejection") kind = "rejection";
  else if (event.intent === "support") kind = "support";
  else if (event.intent === "compliment") kind = "compliment";

  return {
    kind,
    valence: event.valence,
    negativeLoad: event.valence === "negative" ? Math.max(event.severity, event.frustration * 0.6) : 0,
    frustrationLoad: event.frustration || (event.insult ? 0.85 : 0),
    threatLoad: event.redLine ? 0.8 : event.insult ? 0.7 : Math.max(event.coercion * 0.65, event.manipulation * 0.55),
    rewardLoad: event.apology ? 0.55 : event.support > 0 ? 0.7 : event.compliment > 0 ? 0.8 : event.repairAttempt ? 0.45 : 0,
  };
}

function minutesBetween(iso?: string) {
  if (!iso) return null;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / 60000);
}

function applyTemperamentBeforeKdm(
  semanticEvent: SemanticEvent,
  dynamicState?: DroitDynamicState,
): DroitDynamicState | undefined {
  if (!dynamicState) return dynamicState;
  const fineTune = readFineTuneProfile();
  const temperament = temperamentFromFineTune(fineTune);
  const event = appraisalEventFromSemantic(semanticEvent);
  const relationship = dynamicState.relationship;
  const interactionCount = Math.max(0, relationship?.interactionCount || 0);
  const firstSeenAt = relationship?.firstSeenAt ? new Date(relationship.firstSeenAt).getTime() : Date.now();
  const relationshipAgeMinutes = Number.isFinite(firstSeenAt) ? Math.max(0, (Date.now() - firstSeenAt) / 60000) : 0;
  const similarEventsFromSource = event.valence === "negative" ? Math.max(0, relationship?.negativeEvents || 0) : event.valence === "positive" ? Math.max(0, relationship?.positiveEvents || 0) : 0;
  const appraisal = appraiseEventV0(
    { kind: event.kind, sourceId: "active-user", targetIsKaira: semanticEvent.target === "kaira", valence: event.valence },
    { relationshipAgeMinutes, interactionCount, similarEventsFromSource, similarEventsRecentGlobal: similarEventsFromSource, distinctSourcesRecentGlobal: 1, minutesSinceLastSimilarEvent: event.valence === "negative" ? minutesBetween(relationship?.lastConflictAt) : null },
  );
  const warmth = Math.max(0, Math.min(100, relationship?.warmth ?? 50));
  const trust = Math.max(0, Math.min(100, relationship?.trust ?? 50));
  const conflict = Math.max(0, Math.min(100, relationship?.conflictScore ?? 0));
  const hurt = Math.max(0, Math.min(100, relationship?.hurtScore ?? 0));
  const relationshipSafety = Math.max(0, Math.min(1, (warmth * 0.35 + trust * 0.45 - conflict * 0.1 - hurt * 0.1) / 80));
  const temperamentResponse = computeTemperamentResponse(temperament, {
    negativeLoad: event.negativeLoad,
    frustrationLoad: event.frustrationLoad,
    threatLoad: event.threatLoad,
    rewardLoad: event.rewardLoad * (0.65 + appraisal.positivePredictionError * 0.35),
    noveltyLoad: appraisal.novelty.value,
    repetitionLoad: 1 - appraisal.novelty.value,
    relationshipSafety,
    currentStress: Math.max(0, Math.min(1, dynamicState.stress / 100)),
    minutesSinceEvent: 0,
  });
  const delta = temperamentResponse.stateDelta;
  return { ...dynamicState, anger: clamp100(dynamicState.anger + delta.anger), stress: clamp100(dynamicState.stress + delta.stress), happiness: clamp100(dynamicState.happiness + delta.happiness), calmness: clamp100(dynamicState.calmness + delta.calmness), confidence: clamp100(dynamicState.confidence + delta.confidence), surprise: clamp100(dynamicState.surprise + delta.surprise) };
}

export const droitChatService = {
  async sendMessage({ userMessage, personality, dynamicState, history = [], characterInfo = { name: "KAIRO", roleTitle: "Sunucu Yöneticisi", raceName: "Sentetik Droit" }, provider = "openrouter", userId: explicitUserId, userName = "Kullanıcı", suppressRecentMemory = false, sessionId, kairaInstanceId, kairaInstanceType }: SendKairoChatOptions): Promise<KairoChatResponse> {
    const totalStart = performance.now();
    const userId = resolveConversationUserId(explicitUserId);
    const kairaInstance = resolveKairaInstanceContext({ instanceId: kairaInstanceId, instanceType: kairaInstanceType });
    const resolvedSessionId = sessionId?.trim() || freshSessionId(userId, kairaInstance.instanceId);
    const prepStart = performance.now();
    const fineTune = readFineTuneProfile();
    let languageUnderstanding: ClientLanguageUnderstandingResult;
    try {
      languageUnderstanding = await requestCanonicalLanguageUnderstanding({
        message: userMessage,
        userName,
        characterName: characterInfo.name || "KAIRO",
        provider,
        recentMessages: history.slice(-8).map((m) => ({
          role: m.sender === "droit" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        })),
      });
    } catch (error) {
      languageUnderstanding = {
        event: interpretSemanticEvent(userMessage),
        semanticSource: "fallback_regex",
        warnings: [
          `Canonical language preflight failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
    const semanticEvent = languageUnderstanding.event;
    const appraisalEvent = appraisalEventFromSemantic(semanticEvent);
    const temperamentAdjustedState = applyTemperamentBeforeKdm(semanticEvent, dynamicState);
    const personalityRuntime = applyPersonalityTendencies(personality, fineTune, userMessage);
    const motivationRuntime = applyMotivations(personalityRuntime.personality, fineTune, userMessage);
    const valueRuntime = applyValues(motivationRuntime.personality, fineTune, userMessage);
    const preferenceRuntime = applyPreferences(valueRuntime.personality, fineTune, userMessage);
    const socialRuntime = applySocialOrientation(preferenceRuntime.personality, fineTune, userMessage, temperamentAdjustedState);
    const boundaryRuntime = applyBoundaries(socialRuntime.personality, fineTune, userMessage, temperamentAdjustedState, semanticEvent);
    const expressionRuntime = applyExpressionStyle(boundaryRuntime.personality, fineTune, userMessage, temperamentAdjustedState);
    const integrationRuntime = integrateBehaviorLayers({
      personality: expressionRuntime.personality,
      dynamicState: temperamentAdjustedState,
      userMessage,
      semanticEvent,
      personalityTendency: personalityRuntime.response,
      motivation: motivationRuntime.response,
      values: valueRuntime.response,
      preferences: preferenceRuntime.response,
      social: socialRuntime.response,
      boundaries: boundaryRuntime.response,
      expression: expressionRuntime.response,
    });
    const runtimePersonality = integrationRuntime.personality;
    const behaviorProfile = computeBehaviorProfile(runtimePersonality, userMessage);
    const clientPrepMs = Math.round(performance.now() - prepStart);

    const payload = { sessionId: resolvedSessionId, userId, userName, userMessage, semanticEvent, character: characterInfo, personality: runtimePersonality, behaviorProfile, personalityTendency: personalityRuntime.response, motivation: motivationRuntime.response, values: valueRuntime.response, preferences: preferenceRuntime.response, socialOrientation: socialRuntime.response, boundaries: boundaryRuntime.response, expressionStyle: expressionRuntime.response, behaviorDecision: integrationRuntime.decision, behaviorPressures: integrationRuntime.pressures, dynamicState, history: history.slice(-24).map((m) => ({ sender: m.sender, text: m.text, participantId: m.participantId, participantName: m.participantName, replyToParticipantId: m.replyToParticipantId, replyToParticipantName: m.replyToParticipantName })), provider, suppressRecentMemory, kairaInstanceId: kairaInstance.instanceId, kairaInstanceType: kairaInstance.instanceType };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch("/api/chat", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Sunucu hatası: ${res.status}`); }
      const data = await res.json();
      const reply = data.reply || "";
      const nextDynamicState = data.kdm?.dynamicState as DroitDynamicState | undefined;
      const reasoningTrace = data.kdm?.trace as ReasoningTrace | undefined;
      const canonicalSemanticEvent = (data.kdm?.semanticEvent as SemanticEvent | undefined) ?? semanticEvent;
      const semanticSource = languageUnderstanding.semanticSource;
      const consistency = (data.consistency as ResponseConsistencyResult | undefined) ?? (reasoningTrace ? validateKairoResponse(reply, reasoningTrace) : undefined);
      const totalMs = Math.round(performance.now() - totalStart);
      const server = data.timings || {};
      const serverTotalMs = Number(server.serverTotalMs || 0);
      const timings: KairoTimingMetrics = { clientPrepMs, serverTotalMs, memoryMs: Number(server.memoryMs || 0), kdmMs: Number(server.kdmMs || 0), aiMs: Number(server.aiMs || 0), postProcessMs: Number(server.postProcessMs || 0), networkAndOverheadMs: Math.max(0, totalMs - clientPrepMs - serverTotalMs), totalMs };
      void saveTestSessionLayerAudit(data.sessionId || resolvedSessionId, data.turnId, {
        semanticEvent: canonicalSemanticEvent,
        semanticSource,
        languageUnderstanding: {
          semanticProvider: languageUnderstanding.semanticProvider,
          morphologyProvider: languageUnderstanding.morphologyProvider,
          morphology: languageUnderstanding.morphology,
          warnings: languageUnderstanding.warnings,
        },
        appraisalTemperament: { event: appraisalEvent, fineTune: temperamentFromFineTune(fineTune) },
        personalityTendency: personalityRuntime.response,
        motivation: motivationRuntime.response,
        values: valueRuntime.response,
        preferences: preferenceRuntime.response,
        socialOrientation: socialRuntime.response,
        boundaries: boundaryRuntime.response,
        expressionStyle: expressionRuntime.response,
        behaviorDecision: integrationRuntime.decision,
        behaviorPressures: integrationRuntime.pressures,
        rawDynamicStateBefore: dynamicState,
        temperamentAdjustedState,
      });
      return { reply, profile: behaviorProfile, dynamicState: nextDynamicState, reasoningTrace, consistency, providerUsed: data.providerUsed, timings, sessionId: data.sessionId || resolvedSessionId, turnId: data.turnId, kairaInstanceId: data.kairaInstanceId || kairaInstance.instanceId, kairaInstanceType: data.kairaInstanceType || kairaInstance.instanceType, languageUnderstanding, worldStateAppraisal: data.kdm?.worldStateAppraisal, worldReasoningPolicy: data.kdm?.worldReasoningPolicy, worldMemoryGuard: data.kdm?.worldMemoryGuard, responsePlan: data.kdm?.responsePlan };
    } catch (err: any) {
      if (err?.name === "AbortError") throw new Error("Kaira yanıtı 35 saniyeyi aştı. OpenRouter/model gecikmesi olabilir.");
      throw err;
    } finally { clearTimeout(timeout); }
  },
};
