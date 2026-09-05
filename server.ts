import express from "express";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { analyzeKdmInteractionCanonicalTurn } from "./src/services/kdmConsistencyEngine";
import { normalizeBehaviorPolicyInput } from "./src/services/behaviorPolicyInput";
import { claimCoordinatedKairaChatRequest, completeCoordinatedKairaChatRequest, failCoordinatedKairaChatRequest } from "./src/services/kairaChatIdempotencyCoordinator";
import { normalizeDroitPersonality } from "./src/services/droitPersonalityNormalizer";
import { resolveServerLanguageUnderstanding } from "./src/services/serverLanguageUnderstanding";
import { buildBehaviorContract, behaviorContractInstruction } from "./src/services/behaviorContract";
import { enforceBehaviorContract } from "./src/services/behaviorContractEnforcer";
import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./src/services/kairaResponsePlan";
import {
  buildCanonicalBehaviorBlock,
  buildCanonicalObservationalContext,
  buildCanonicalDialogueMoveContext,
} from "./src/services/kairaCanonicalPromptBuilder";
import {
  deriveDiscourseState,
  reduceDiscourseState,
  buildDiscourseObservationalInstruction,
} from "./src/services/discourseStateReducer";
import {
  decideKairaControlledSpontaneity,
  kairaControlledSpontaneityInstruction,
} from "./src/services/kairaControlledSpontaneity";
import {
  loadKdmState,
  loadRecentKdmMemory,
  saveKdmInteraction,
  saveKntTrace,
  loadRecentKntTraces,
  saveTestSessionTurn,
  loadTestSession,
  loadActiveTestSessionForUser,
  clearTestSession,
} from "./src/services/kdmPersistenceService";
import { validateMemoryAgainstMessage } from "./src/services/kairoMemoryConsistency";
import { persistentMemoryFetchLimitForDialogueMove, FAST_RECENT_MEMORY_LIMIT } from "./src/services/kairaPersistentMemoryRetrievalPolicy";
import {
  enforceKairoResponse,
  findKairoAffectiveResponseIssues,
  validateKairoResponse,
} from "./src/services/kairoResponseConsistency";
import { findKairoResponseRhythmIssues } from "./src/services/kairoResponseRhythm";
import {
  buildActiveParticipantInstruction,
  buildKairoGroundingInstruction,
  findKairoGroundingIssues,
  findKairoTranscriptEchoIssues,
  formatKairoHistoryForModel,
  sanitizeKairoReplyText,
  sanitizeKairoChatHistory,
} from "./src/services/kairoConversationGrounding";
import {
  buildDialogueBoardInstruction,
  findDialogueAttributionIssues,
} from "./src/services/kairoDialogueChaosEngine";
import { projectSemanticEventToDialogueAnalysis } from "./src/services/kairaDialogueTurnProjection";
import {
  buildDialogueDecisionInstruction,
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./src/services/kairoDialogueDecisionEngine";
import { recordKdmMetric } from "./src/services/kdmMetricsService";
import { loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";
import { persistWorldEventAndMaybeConsolidateLivedMemory } from "./src/services/kairaLivedMemoryRuntime";
import { observeKairaActivityDynamicState } from "./src/services/kairaActivityDynamicStateObservationCoordinator";
import {
  composeKairaActivityPermissionChatReply,
  presentKairaActivityPermissionChatPrompt,
  resolveKairaActivityPermissionChatReply,
  type KairaActivityPermissionChatPrompt,
} from "./src/services/kairaActivityPermissionChatRuntime";
import { buildWorldEventMemoryInstruction, rankWorldEventObservations, shouldRetrieveWorldEvents } from "./src/services/worldEventRetrieval";
import { enforceWorldModelRecallResponse, findWorldModelResponseIssues } from "./src/services/worldModelResponseGuard";
import { appraiseRetrievedWorldState, buildWorldStateAppraisalInstruction } from "./src/services/worldStateAppraisal";
import { deriveWorldReasoningPolicy, buildWorldReasoningPolicyInstruction } from "./src/services/worldReasoningPolicy";
import {
  computeKairoSpeechIdentity,
  speechIdentityPrompt,
} from "./src/services/kairoSpeechIdentity";
import { tryLocalKairoReply } from "./src/services/kairoLocalLanguageEngine";
import {
  hydrateLanguageMemory,
  languageMemorySummary,
  languageStyleMemoryInstruction,
  languageStyleMemorySignal,
  dyadicLanguageAlignmentInstruction,
  observeUserLanguageStyle,
  learnLanguageReply,
} from "./src/services/kairoLanguageMemory";
import {
  instancePolicy,
  memoryCacheKey,
  resolveKairaInstanceContext,
  stateOwnerScope,
  type KairaInstanceType,
} from "./src/services/kairaInstanceContext";
import { buildKairaRuntimeIdentityInstruction } from "./src/services/kairaRuntimeIdentity";
import { resolveKairaAutobiographicalRecallRuntime } from "./src/services/kairaAutobiographicalRecallRuntime";
import { enforceKairaAutobiographicalResponse } from "./src/services/kairaAutobiographicalResponseGuard";
import { runKairaResponseConstraintPass } from "./src/services/kairaResponseConstraintPass";
import { loadKairaKnowledgeProfileResult } from "./src/services/kairaKnowledgeProfileStore";
import { evaluateKairaKnowledge, unavailableKairaKnowledgeDecision } from "./src/services/kairaEpistemicGate";
import {
  buildKairaEpistemicInstruction,
  enforceKairaEpistemicResponse,
  findKairaEpistemicResponseIssues,
} from "./src/services/kairaEpistemicResponsePolicy";
import { registerKairaProposalRecoveryWorkerRoute } from "./src/services/kairaProposalRecoveryWorkerRoute";
import { registerKairaActivityProvisioningRoute } from "./src/services/kairaActivityProvisioningRoute";
import type {
  DroitDynamicState,
} from "./src/types/nexus";
dotenv.config();
const app = express(),
  PORT = 3000;
app.use(express.json());
registerKairaProposalRecoveryWorkerRoute(app);
registerKairaActivityProvisioningRoute(app);
let aiClient: GoogleGenAI | null = null;
const now = () => performance.now(),
  memoryCache = new Map<
    string,
    {
      expires: number;
      items: Array<{
        userMessage: string;
        reply: string;
        memoryScope?: string;
        dialogueAnalysis?: { factConfidence?: number };
      }>;
    }
  >(),
  MEMORY_TTL_MS = 30000,
  sleep = <T>(ms: number, value: T) =>
    new Promise<T>((r) => setTimeout(() => r(value), ms));
function getGeminiClient() {
  if (!aiClient)
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return aiClient;
}
function extractOpenRouterText(data: any) {
  const d = data?.choices?.[0]?.message?.content;
  if (typeof d === "string") return d.trim();
  if (Array.isArray(d))
    return d
      .map((part: any) =>
        typeof part === "string" ? part : String(part?.text || ""),
      )
      .join("")
      .trim();
  return "";
}
async function callOpenRouter(messages: any[], temperature: number) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY bulunamadı.");
  const freeModel = "openrouter/free";
  const primaryModel = process.env.OPENROUTER_MODEL?.trim() || freeModel;
  const requestModel = async (model: string, maxTokens?: number) => {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
          "X-Title": "NEXUS Kairo Studio",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };
  let { response, data } = await requestModel(primaryModel);
  const affordableTokens = Number(
    String(data?.error?.message || "").match(/can only afford\s+(\d+)/i)?.[1],
  );
  if (!response.ok && affordableTokens >= 40) {
    ({ response, data } = await requestModel(
      primaryModel,
      Math.max(32, affordableTokens - 8),
    ));
  }
  if (!response.ok)
    throw new Error(
      data?.error?.message || `OpenRouter hatası: HTTP ${response.status}`,
    );
  let text = extractOpenRouterText(data);
  if (!text) {
    ({ response, data } = await requestModel(primaryModel));
    if (!response.ok)
      throw new Error(
        data?.error?.message || `OpenRouter hatası: HTTP ${response.status}`,
      );
    text = extractOpenRouterText(data);
  }
  if (!text) throw new Error("OpenRouter boş yanıt döndürdü.");
  return text;
}
type AiProviderUsed = "gemini" | "openrouter" | "deterministic_fallback";
type GeneratedTextResult = {
  text: string;
  providerUsed: Exclude<AiProviderUsed, "deterministic_fallback">;
};
async function generateTextResult(
  system: string,
  messages: any[],
  temperature: number,
  preferredProvider: string,
): Promise<GeneratedTextResult> {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (preferredProvider === "openrouter" && hasOpenRouter) {
    try {
      const text = await callOpenRouter(
        [{ role: "system", content: system }, ...messages],
        temperature,
      );
      return { text, providerUsed: "openrouter" };
    } catch (openRouterErr) {
      console.warn("[Provider] OpenRouter failed, falling back to Gemini:", openRouterErr);
      if (hasGemini) {
        const response = await getGeminiClient().models.generateContent({
          model: "gemini-3.6-flash",
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          config: { systemInstruction: system },
        });
        return { text: (response?.text || "").trim(), providerUsed: "gemini" };
      }
      throw openRouterErr;
    }
  }

  if (hasGemini) {
    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { systemInstruction: system },
    });
    return { text: (response?.text || "").trim(), providerUsed: "gemini" };
  }

  if (hasOpenRouter) {
    const text = await callOpenRouter(
      [{ role: "system", content: system }, ...messages],
      temperature,
    );
    return { text, providerUsed: "openrouter" };
  }

  throw new Error("Yapay zeka anahtarı (GEMINI_API_KEY veya OPENROUTER_API_KEY) bulunamadı.");
}
async function generateText(
  system: string,
  messages: any[],
  temperature: number,
  preferredProvider: string,
): Promise<string> {
  return (await generateTextResult(system, messages, temperature, preferredProvider)).text;
}
async function getFastRecentMemory(userId: string, kairaInstanceId: string) {
  const cacheKey = memoryCacheKey(userId, kairaInstanceId);
  const c = memoryCache.get(cacheKey);
  if (c && c.expires > Date.now()) return c.items;
  const scopedUserId = stateOwnerScope(userId, kairaInstanceId);
  const loader = loadRecentKdmMemory(FAST_RECENT_MEMORY_LIMIT, scopedUserId)
    .then(
      (items) => (
        memoryCache.set(cacheKey, { expires: Date.now() + MEMORY_TTL_MS, items }),
        items
      ),
    )
    .catch(() => []);
  return Promise.race([loader, sleep(700, [])]);
}
const SESSION_STOP_WORDS = new Set([
  "bu",
  "şu",
  "o",
  "ve",
  "ile",
  "de",
  "da",
  "ya",
  "bir",
  "bi",
  "ne",
  "neyi",
  "nasıl",
  "niye",
  "neden",
  "sence",
  "bana",
  "sana",
  "ben",
  "sen",
  "biz",
  "siz",
  "için",
  "gibi",
  "daha",
  "çok",
  "az",
  "hala",
  "hâlâ",
  "acaba",
  "ki",
  "mı",
  "mi",
  "mu",
  "mü",
  "neydi",
  "yapacaktı",
]);
function sessionTokens(text: string) {
  return Array.from(
    new Set(
      text
        .toLocaleLowerCase("tr-TR")
        .replace(/[^a-zçğıöşü0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((x) => x.length >= 3 && !SESSION_STOP_WORDS.has(x)),
    ),
  );
}
function buildSessionWorkingMemory(history: any[], userMessage: string) {
  if (!Array.isArray(history) || history.length <= 8)
    return "Yakın oturum geçmişi yeterli; ek çalışma hafızası yok.";
  const older = history.slice(0, -8),
    tokens = sessionTokens(userMessage);
  const scored = older
    .map((item: any, index: number) => {
      const text = String(item?.text || "");
      const low = text.toLocaleLowerCase("tr-TR");
      const overlap = tokens.reduce((n, t) => n + (low.includes(t) ? 1 : 0), 0);
      const recency = (index + 1) / Math.max(1, older.length);
      return { item, index, score: overlap * 10 + recency };
    })
    .filter((x) => x.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index);
  if (!scored.length)
    return "Bu soruyla ilgili daha eski aynı-oturum kaydı bulunamadı.";
  return scored
    .map(
      (x) =>
        `${x.item.sender === "user" ? x.item.participantName || "Kullanıcı" : "Kaira"}: ${String(x.item.text || "").slice(0, 320)}`,
    )
    .join("\n");
}
app.post("/api/language-understanding", async (req, res) => {
  try {
    const {
      userMessage,
      userName = "Kullanıcı",
      characterName = "KAIRO",
      history = [],
      provider = "openrouter",
    } = req.body || {};
    if (!userMessage?.trim())
      return res.status(400).json({ error: "userMessage is required" });

    const recentMessages = Array.isArray(history)
      ? history.slice(-8).map((item: any) => ({
          role: item?.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(item?.content || ""),
        }))
      : [];

    const result = await resolveServerLanguageUnderstanding({
      message: String(userMessage),
      context: { userName, characterName, recentMessages },
      preferredProvider: provider,
      generateText,
    });

    res.json({ ok: true, ...result });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || "Language understanding failed",
    });
  }
});

app.get("/api/health", (_q, r) =>
  r.json({ status: "ok", timestamp: new Date().toISOString() }),
);
app.get("/api/runtime-info", (_q, r) => {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const activeProvider = hasOpenRouter ? "openrouter" : (hasGemini ? "gemini" : "local_language");
  r.json({
    status: "ok",
    activeProvider,
    model:
      process.env.OPENROUTER_MODEL?.trim() ||
      (activeProvider === "openrouter"
        ? "openrouter/free"
        : "gemini-3.6-flash"),
    providers: {
      openrouter: hasOpenRouter,
      gemini: hasGemini,
    },
    persistence: "Firestore",
    recentMemoryLimit: 6,
    sessionHistoryLimit: 24,
    generatedAt: new Date().toISOString(),
  });
});
app.get("/api/knt/traces", async (q, r) => {
  try {
    const userId = typeof q.query.userId === "string" ? q.query.userId : "test_user_x";
    const kairaInstanceId = typeof q.query.kairaInstanceId === "string" ? q.query.kairaInstanceId : undefined;
    const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
    const scopedUserId = stateOwnerScope(userId, instance.instanceId);
    const traces = await loadRecentKntTraces(Number(q.query.limit || 20), scopedUserId);
    r.json({ ok: true, userId, kairaInstanceId: instance.instanceId, count: traces.length, traces });
  } catch (e: any) {
    r.status(500).json({ ok: false, error: e?.message });
  }
});
app.get("/api/kaira/language-memory", async (q, r) => {
  const userId = typeof q.query.userId === "string" ? q.query.userId : "test_user_x";
  const kairaInstanceId = typeof q.query.kairaInstanceId === "string" ? q.query.kairaInstanceId : undefined;
  const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
  const policy = instancePolicy(instance.instanceType);
  const scopedUserId = stateOwnerScope(userId, instance.instanceId);
  if (policy.persistentUserMemory) await hydrateLanguageMemory(scopedUserId);
  r.json({
    ok: true,
    userId,
    kairaInstanceId: instance.instanceId,
    ...languageMemorySummary(scopedUserId, policy.persistentUserMemory),
  });
});
app.get("/api/test-sessions/active", async (q, r) => {
  try {
    const userId = typeof q.query.userId === "string" ? q.query.userId : "test_user_x";
    const kairaInstanceId = typeof q.query.kairaInstanceId === "string" ? q.query.kairaInstanceId : undefined;
    const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
    const session = await loadActiveTestSessionForUser(stateOwnerScope(userId, instance.instanceId));
    r.json({ ok: true, kairaInstanceId: instance.instanceId, session });
  } catch (e: any) {
    r.status(500).json({ ok: false, error: e?.message });
  }
});
app.get("/api/test-sessions/:sessionId", async (q, r) => {
  try {
    const { sessionId } = q.params;
    const session = await loadTestSession(sessionId);
    if (!session) return r.status(404).json({ ok: false, error: "Session not found" });
    r.json({ ok: true, session });
  } catch (e: any) {
    r.status(500).json({ ok: false, error: e?.message });
  }
});
app.post("/api/test-sessions/new", async (q, r) => {
  try {
    const { userId = "test_user_x", kairaInstanceId, kairaInstanceType } = q.body || {};
    const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId, instanceType: kairaInstanceType as KairaInstanceType | undefined });
    const safeOwner = stateOwnerScope(String(userId), instance.instanceId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const sessionId = `session_${safeOwner}_${Date.now()}`;
    r.json({ ok: true, sessionId, kairaInstanceId: instance.instanceId, kairaInstanceType: instance.instanceType });
  } catch (e: any) {
    r.status(500).json({ ok: false, error: e?.message });
  }
});
app.delete("/api/test-sessions/:sessionId", async (q, r) => {
  try {
    const { sessionId } = q.params;
    await clearTestSession(sessionId);
    r.json({ ok: true });
  } catch (e: any) {
    r.status(500).json({ ok: false, error: e?.message });
  }
});
const defaultDynamicState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};
function normalizeDynamicState(v: any): DroitDynamicState {
  return { ...defaultDynamicState, ...(v || {}) };
}
function normalizeKdmSemanticAliases(message: string) {
  return message
    .replace(/\bmalsın\b/gi, "salaksın")
    .replace(/\bmal\b/gi, "salak");
}
function buildEntityGroundingInstruction(entityResolution: any) {
  if (!entityResolution) return "";
  const refs = Array.isArray(entityResolution.references)
    ? entityResolution.references
        .map((ref: any) => {
          const resolved = ref.resolvedName || ref.resolvedId || "çözülmedi";
          return `${ref.surface} => ${resolved} (rol=${ref.role}, güven=${Number(ref.confidence ?? 0).toFixed(2)})`;
        })
        .join("; ")
    : "yok";
  const ambiguities = Array.isArray(entityResolution.ambiguities) && entityResolution.ambiguities.length
    ? entityResolution.ambiguities.join(" | ")
    : "yok";
  return `ENTITY / WORLD GROUNDING:\nKonuşan kişi: ${entityResolution.speaker?.name || "bilinmiyor"}.\nMuhatap: ${entityResolution.addressee?.name || "Kaira"}.\nReferanslar: ${refs}.\nBelirsizlikler: ${ambiguities}.\nKURALLAR: Birinci şahıs (ben/bana/beni) konuşan kişiye, ikinci şahıs (sen/sana/seni) Kaira'ya aittir. Açık isim çözümü mevcut konuşanla aynı kişiye çıkıyorsa bunu otomatik olarak ayrı bir üçüncü şahıs yapma. Belirsizlik varsa kişi/olay ataması UYDURMA; cevabı belirsizliği koruyacak şekilde yaz. Kullanıcının söylemediği "bunu ben söyledim", "şu kişi yaptı" gibi yeni bir kaynak/aktör icat etme.`;
}

function buildWorldEventInstruction(worldEvent: any) {
  if (!worldEvent) return "";
  const actor = worldEvent.actor?.name || worldEvent.actor?.id || "çözülmedi";
  const target = worldEvent.target?.name || worldEvent.target?.id || "çözülmedi";
  const ambiguities = Array.isArray(worldEvent.ambiguities) && worldEvent.ambiguities.length
    ? worldEvent.ambiguities.join(" | ")
    : "yok";
  return `CANONICAL WORLD EVENT:\nOlay tipi: ${worldEvent.eventType || "unknown"}.\nActor: ${actor}.\nTarget: ${target}.\nAktarılan söz: ${worldEvent.reportedSpeech ? "evet" : "hayır"}.\nKesinlik: ${Number(worldEvent.certainty ?? 0).toFixed(2)}.\nBelirsizlikler: ${ambiguities}.\nKURAL: Bu olay haritasını kaynak gerçekliği olarak kullan. Actor veya target çözülmemişse kimlik UYDURMA. Kullanıcının söylemediği yeni bir fail, hedef veya olay ekleme.`;
}
app.post("/api/chat", async (req, res) => {
  const serverStart = now();
  let idempotencyKey = "";
  let ownsIdempotencyClaim = false;
  try {
    const {
      userId = "anonymous",
      userName = "Kullanıcı",
      userMessage,
      character = {},
      personality,
      responsePersonality: incomingResponsePersonality,
      history = [],
      dynamicState = defaultDynamicState,
      provider = "openrouter",
      suppressRecentMemory = false,
      semanticInterpretation: incomingSemanticInterpretation,
      behaviorPolicy: incomingBehaviorPolicy,
      sessionId: incomingSessionId,
      kairaInstanceId: incomingKairaInstanceId,
      kairaInstanceType: incomingKairaInstanceType,
      requestId: incomingRequestId,
      activityPermissionRequestId: incomingActivityPermissionRequestId,
    } = req.body;
    if (!userMessage)
      return res.status(400).json({ error: "userMessage is required" });
    const kairaInstance = resolveKairaInstanceContext({
      instanceId: incomingKairaInstanceId,
      instanceType: incomingKairaInstanceType as KairaInstanceType | undefined,
    });
    const kairaPolicy = instancePolicy(kairaInstance.instanceType);
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const stateUserId = stateOwnerScope(userId, kairaInstance.instanceId);
    const sessionId = incomingSessionId?.trim() || `session_${stateUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const requestId = typeof incomingRequestId === "string" ? incomingRequestId.trim().slice(0, 160) : "";
    idempotencyKey = requestId ? `${stateUserId}::${kairaInstance.instanceId}::${requestId}` : "";
    if (idempotencyKey) {
      const claim = await claimCoordinatedKairaChatRequest<any>(idempotencyKey);
      if (claim.kind === "replay") return res.json(claim.payload);
      if (claim.kind === "wait") {
        const outcome = await claim.outcome;
        if (outcome.ok === true) return res.json(outcome.payload);
        throw new Error(outcome.errorMessage);
      }
      ownsIdempotencyClaim = true;
    }
    const sendChatPayload = async (payload: any) => {
      if (idempotencyKey && ownsIdempotencyClaim) {
        await completeCoordinatedKairaChatRequest(idempotencyKey, payload);
        ownsIdempotencyClaim = false;
      }
      return res.json(payload);
    };
    const activityPermissionResolution = kairaPolicy.autonomousActivityPlanning
      ? await resolveKairaActivityPermissionChatReply({
          ownerUserId: userId,
          kairaInstanceId: kairaInstance.instanceId,
          sessionId,
          permissionRequestId:
            typeof incomingActivityPermissionRequestId === "string"
              ? incomingActivityPermissionRequestId.trim()
              : undefined,
          message: String(userMessage),
          now: new Date().toISOString(),
        })
      : ({ status: "none" } as const);
    let activityPermissionPrompt: KairaActivityPermissionChatPrompt | null = null;
    const attachActivityPermission = async (baseReply: string) => {
      if (!kairaPolicy.autonomousActivityPlanning) return baseReply;
      activityPermissionPrompt = await presentKairaActivityPermissionChatPrompt({
        ownerUserId: userId,
        kairaInstanceId: kairaInstance.instanceId,
        sessionId,
        promptTurnId: `permission_prompt_${requestId || `${sessionId}_${cleanHistory.length}`}`,
        now: new Date().toISOString(),
      });
      return composeKairaActivityPermissionChatReply({
        reply: baseReply,
        resolution: activityPermissionResolution,
        prompt: activityPermissionPrompt,
      });
    };
    const cleanHistory = sanitizeKairoChatHistory(history);
    const languageUnderstanding = await resolveServerLanguageUnderstanding({
      message: userMessage,
      incomingSemanticInterpretation,
      context: {
        userName,
        characterName: character.name || "KAIRO",
        recentMessages: cleanHistory.slice(-8).map((item: any) => ({
          role:
            item.sender === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: String(item.text || ""),
        })),
      },
      preferredProvider: provider,
      generateText,
    });
    const canonicalSemantic = {
      interpretation: languageUnderstanding.interpretation,
      event: languageUnderstanding.event,
      source: languageUnderstanding.semanticSource,
    };
    const retrievedWorldEvents = kairaPolicy.persistentWorldModel && shouldRetrieveWorldEvents(canonicalSemantic.interpretation)
      ? rankWorldEventObservations(
          userMessage,
          await loadRecentWorldEventObservations(userId, 30, kairaInstance.instanceId).catch(() => []),
          5,
        )
      : [];
    const worldEventMemoryInstruction = buildWorldEventMemoryInstruction(retrievedWorldEvents);
    const worldStateAppraisal = appraiseRetrievedWorldState(retrievedWorldEvents);
    const worldStateAppraisalInstruction = buildWorldStateAppraisalInstruction(worldStateAppraisal);
    const worldReasoningPolicy = deriveWorldReasoningPolicy(worldStateAppraisal);
    const worldReasoningContext = { appraisal: worldStateAppraisal, policy: worldReasoningPolicy };
    const worldReasoningPolicyInstruction = buildWorldReasoningPolicyInstruction(worldReasoningPolicy);
    const knowledgeQuery =
      canonicalSemantic.event.knowledgeQuery && canonicalSemantic.event.knowledgeQuery.confidence >= 0.72
        ? canonicalSemantic.event.knowledgeQuery
        : null;
    const knowledgeProfileLoad =
      knowledgeQuery && kairaPolicy.persistentIdentity
        ? await loadKairaKnowledgeProfileResult(kairaInstance.instanceId)
        : null;
    const knowledgeProfile =
      knowledgeProfileLoad?.status === "loaded" ? knowledgeProfileLoad.profile : null;
    const epistemicAccess = knowledgeQuery
      ? {
          query: {
            kairaInstanceId: kairaInstance.instanceId,
            ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),
            surface: knowledgeQuery.surface,
          },
          decision:
            knowledgeProfileLoad?.status === "unavailable"
              ? unavailableKairaKnowledgeDecision()
              : evaluateKairaKnowledge(
                  {
                    kairaInstanceId: kairaInstance.instanceId,
                    ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),
                    surface: knowledgeQuery.surface,
                  },
                  knowledgeProfile,
                ),
        }
      : null;
    const epistemicInstruction = buildKairaEpistemicInstruction(epistemicAccess);
    const selfMemoryRuntime = await resolveKairaAutobiographicalRecallRuntime({
      instance: kairaInstance,
      query: canonicalSemantic.event.selfMemoryQuery,
    });
    const selfMemoryInstruction = selfMemoryRuntime.instruction;
    const dialogueAnalysis = projectSemanticEventToDialogueAnalysis(languageUnderstanding.event);
    const dialogueInstruction = buildDialogueBoardInstruction(
      cleanHistory,
      userMessage,
      userName,
      dialogueAnalysis,
    );
    // Minimal session-scoped discourse context (routine saturation, pending
    // question, Kaira self-repetition, previous-turn dependency). Recomputed
    // from history each turn — no separate persistence, no decision authority.
    const discourseState = deriveDiscourseState(cleanHistory, {
      message: userMessage,
      event: languageUnderstanding.event,
    });
    const dialogueDecision = planDialogueResponse(
      cleanHistory,
      userMessage,
      userName,
      languageUnderstanding.event,
      dialogueAnalysis,
      discourseState,
    );
    const memoryStart = now();
    const [persistedState, persistentMemory] = await Promise.all([
      kairaPolicy.persistentRelationship ? loadKdmState(stateUserId).catch(() => null) : Promise.resolve(null),
      suppressRecentMemory || !kairaPolicy.persistentUserMemory
        ? Promise.resolve([])
        : persistentMemoryFetchLimitForDialogueMove(dialogueDecision.move) === FAST_RECENT_MEMORY_LIMIT
          ? getFastRecentMemory(userId, kairaInstance.instanceId)
          : loadRecentKdmMemory(
              persistentMemoryFetchLimitForDialogueMove(dialogueDecision.move),
              stateUserId,
            ),
      kairaPolicy.persistentUserMemory ? hydrateLanguageMemory(stateUserId) : Promise.resolve(),
    ]);
    observeUserLanguageStyle(stateUserId, userMessage, kairaPolicy.persistentUserMemory);
    const memoryMs = Math.round(now() - memoryStart),
      languageStyleMemory = languageStyleMemorySignal(stateUserId, kairaPolicy.persistentUserMemory),
      requestState = normalizeDynamicState(dynamicState),
      effective = dynamicState?.relationship
        ? requestState
        : normalizeDynamicState(persistedState ?? dynamicState),
      basePersonality = normalizeDroitPersonality(personality),
      responsePersonality = normalizeDroitPersonality(incomingResponsePersonality ?? basePersonality),
      behaviorPolicy = normalizeBehaviorPolicyInput(incomingBehaviorPolicy),
      kdmStart = now(),
      kdm = analyzeKdmInteractionCanonicalTurn(
        userMessage,
        basePersonality,
        effective,
        canonicalSemantic.interpretation,
        canonicalSemantic.event,
        behaviorPolicy,
      ),
      behaviorContract = buildBehaviorContract(kdm.nextDynamicState, kdm.trace, canonicalSemantic.event),
      behaviorProfile = kdm.behaviorProfile,
      speech = computeKairoSpeechIdentity(
        responsePersonality,
        kdm.nextDynamicState,
        kdm.trace,
        behaviorPolicy?.expressionStyle,
      ),
      responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech),
      spontaneityDecision = decideKairaControlledSpontaneity({
        responsePlan,
        dynamicState: kdm.nextDynamicState,
        history: cleanHistory,
      }),
      responsePlanInstruction = [
        buildCanonicalBehaviorBlock(responsePlan),
        kairaControlledSpontaneityInstruction(spontaneityDecision, responsePlan),
      ].join("\n"),
      dialogueDecisionInstruction = buildCanonicalDialogueMoveContext(
            dialogueDecision.move,
            dialogueDecision.target,
            dialogueDecision.reason,
          ),
      enforcementRules = {
        continueConversation: responsePlan.continueConversation,
        humorAllowed: responsePlan.allowHumor,
        askQuestion: responsePlan.allowQuestion,
        behaviorContract,
        emojiLevel: speech.emojiLevel,
        emojiBudget: responsePlan.emojiBudget,
        conversationState: kdm.nextDynamicState.relationship?.conversationState,
      },
      dialogueOutputStyle = {
        emojiLevel: speech.emojiLevel,
        emojiBudget: responsePlan.emojiBudget,
        userMessage,
        allowQuestion: responsePlan.allowQuestion,
        maxSentences: responsePlan.maxSentences,
        maxWords: responsePlan.maxWords,
      },
      local = tryLocalKairoReply(
        userMessage,
        responsePersonality,
        kdm.nextDynamicState,
        kdm.trace,
        stateUserId,
        dialogueDecision.move,
        responsePlan,
        languageUnderstanding.event,
        kairaPolicy.persistentUserMemory,
        discourseState,
      ),
      kdmMs = Math.round(now() - kdmStart),
      validatedMemory = persistentMemory.filter(
        (x: any) =>
          validateMemoryAgainstMessage(
            `${x.userMessage} ${x.reply}`,
            userMessage,
          ).accepted,
      ),
      memoryContext =
        validatedMemory
          .map(
            (x: any) =>
              `[${x.memoryScope || "epizodik"}; güven=${Number(x.dialogueAnalysis?.factConfidence ?? 0.7).toFixed(2)}] ${userName}: ${x.userMessage}\nKairo: ${x.reply}`,
          )
          .join("\n") || "İlgili doğrulanmış anı yok.",
      sessionWorkingMemory = buildSessionWorkingMemory(
        cleanHistory,
        userMessage,
      );
    kdm.trace.whoSent.userName = userName;
    if (!selfMemoryInstruction && local.handled && local.reply) {
      const canonicalConstraint = runKairaResponseConstraintPass({
            reply: local.reply,
            trace: kdm.trace,
            plan: responsePlan,
            worldItems: retrievedWorldEvents,
            worldContext: worldReasoningContext,
            selfMemoryRuntime,
            epistemicContext: epistemicAccess,
          }),
        worldMemoryGuard = canonicalConstraint?.worldGuard ?? enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext),
        epistemicGuard = canonicalConstraint?.epistemicGuard ?? enforceKairaEpistemicResponse(worldMemoryGuard.reply, epistemicAccess),
        baseEnforced = canonicalConstraint?.planEnforcement ?? enforceKairoResponse(epistemicGuard.reply, kdm.trace, enforcementRules),
        contractEnforced = canonicalConstraint
          ? { reply: canonicalConstraint.reply, changed: false, reasons: [] as string[] }
          : enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract),
        enforced = canonicalConstraint
          ? {
              reply: canonicalConstraint.reply,
              changed: canonicalConstraint.changed,
              reasons: canonicalConstraint.reasons,
            }
          : {
              reply: contractEnforced.reply,
              changed: worldMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,
              reasons: [
                ...baseEnforced.reasons,
                ...contractEnforced.reasons,
                ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
                ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),
              ],
            },
        reply = canonicalConstraint?.reply ?? enforced.reply,
        localPlanIssues = canonicalConstraint?.issues ?? findKairaResponsePlanIssues(reply, responsePlan),
        localEpistemicIssues = canonicalConstraint ? [] : findKairaEpistemicResponseIssues(reply, epistemicAccess),
        localBaseConsistency = canonicalConstraint?.consistency ?? validateKairoResponse(reply, kdm.trace),
        consistency = canonicalConstraint
          ? canonicalConstraint.consistency
          : {
              ...localBaseConsistency,
              accepted: localBaseConsistency.accepted && localPlanIssues.length === 0 && localEpistemicIssues.length === 0,
              score: Math.max(0, localBaseConsistency.score - (localPlanIssues.length + localEpistemicIssues.length) * 15),
              issues: [...localBaseConsistency.issues, ...localPlanIssues, ...localEpistemicIssues],
            };
      // The local renderer must not escape the main delivery boundary. If the
      // rendered reply fails any plan / dialogue / grounding / rhythm check,
      // abandon the fast path and let the full LLM pipeline produce the turn.
      const localDeliveryIssues = [
        ...localPlanIssues,
        ...localEpistemicIssues,
        ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),
        ...findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
        ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
      ];
      if (localDeliveryIssues.length === 0) {
      const userFacingReply = await attachActivityPermission(reply);
      if (kairaPolicy.persistentUserMemory && consistency.accepted) {
        learnLanguageReply(stateUserId, reply);
      }
      const postStart = now();
      const livedMemoryRuntime = await persistWorldEventAndMaybeConsolidateLivedMemory({
        userId,
        instance: kairaInstance,
        sessionId,
        speakerName: userName,
        event: languageUnderstanding.worldEvent,
        dynamicStateAfter: kdm.nextDynamicState,
      });
      let savedTurnId = "";
      await Promise.allSettled([
        kairaPolicy.persistentRelationship ? saveKdmInteraction({
          userId: stateUserId,
          dynamicState: kdm.nextDynamicState,
          reasoningTrace: kdm.trace,
          lastUserMessage: userMessage,
          reply: userFacingReply,
          memoryScope: kairaPolicy.persistentUserMemory ? dialogueAnalysis.memoryScope : "session",
          dialogueAnalysis,
          semanticInterpretation: canonicalSemantic.interpretation,
        }) : Promise.resolve(),
        recordKdmMetric({
          userId: stateUserId,
          score: consistency.score,
          accepted: consistency.accepted,
          repaired: false,
          repairAttempts: 0,
          issues: consistency.issues,
        }),
        saveKntTrace({
          userId: stateUserId,
          userMessage,
          reply: userFacingReply,
          reasoningTrace: kdm.trace,
          dynamicState: kdm.nextDynamicState,
          timings: {
            memoryMs,
            kdmMs,
            aiMs: 0,
            postProcessMs: 0,
            serverTotalMs: 0,
          },
          providerUsed: "local_language",
          semanticInterpretation: canonicalSemantic.interpretation,
          semanticEvent: canonicalSemantic.event,
          semanticSource: canonicalSemantic.source,
          languageStyleMemory,
          controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" },
          speechIdentity: speech,
          worldStateAppraisal,
          worldReasoningPolicy,
          worldMemoryGuard,
          epistemicAccess,
          selfMemoryRuntime,
          livedMemoryRuntime,
          responsePlan,
        }),
        saveTestSessionTurn({
          sessionId,
          userId: stateUserId,
          userName,
          userMessage,
          assistantReply: userFacingReply,
          speaker: userName,
          intent: kdm.trace?.messageInterpretation?.intent,
          detectedEmotion: kdm.trace?.messageInterpretation?.sentiment,
          reasoningTrace: kdm.trace,
          kdmResult: {
            chosenTone: kdm.trace?.decision?.chosenTone,
            explanation: kdm.trace?.decision?.explanation,
            score: consistency.score,
            decision: kdm.trace?.decision,
          },
          activationValues: {
            calmness: kdm.nextDynamicState.calmness,
            anger: kdm.nextDynamicState.anger,
            stress: kdm.nextDynamicState.stress,
            happiness: kdm.nextDynamicState.happiness,
            confidence: kdm.nextDynamicState.confidence,
            surprise: kdm.nextDynamicState.surprise,
            deltas: kdm.nextDynamicState.lastEvent?.deltas || [],
          },
          dynamicStateBefore: effective,
          dynamicStateAfter: kdm.nextDynamicState,
          relationshipState:
            kdm.nextDynamicState.relationship || kdm.trace.relationship,
          retrievedMemories: validatedMemory,
          memoryUpdate: kdm.trace?.memoryUpdate,
          consistency: {
            accepted: consistency.accepted,
            score: consistency.score,
            issues: consistency.issues,
            warnings: enforced.reasons,
          },
          metadata: {
            semanticInterpretation: canonicalSemantic.interpretation,
        semanticEvent: canonicalSemantic.event,
            semanticSource: canonicalSemantic.source,
            providerUsed: "local_language",
            languageStyleMemory,
            controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" },
            speechIdentity: speech,
            entityResolution: languageUnderstanding.entityResolution,
            worldEvent: languageUnderstanding.worldEvent,
            retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),
            worldStateAppraisal,
            worldReasoningPolicy,
            worldMemoryGuard,
            epistemicAccess,
            selfMemoryRuntime,
            livedMemoryRuntime,
            responsePlan,
            timings: { memoryMs, kdmMs, aiMs: 0 },
            activityPermission: activityPermissionPrompt,
          },
        }).then((t) => {
          savedTurnId = t.turnId;
        }),
      ]);
      const autonomousStateSourceId = requestId
        ? `chat_request:${requestId}`
        : savedTurnId
          ? `chat_turn:${savedTurnId}`
          : "";
      if (kairaPolicy.autonomousActivityPlanning && autonomousStateSourceId) {
        await Promise.allSettled([
          observeKairaActivityDynamicState({
            ownerUserId: String(userId),
            kairaInstanceId: kairaInstance.instanceId,
            instanceType: kairaInstance.instanceType,
            state: kdm.nextDynamicState,
            observedAt: new Date().toISOString(),
            sourceId: autonomousStateSourceId,
          }),
        ]);
      }
      memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));
      const postProcessMs = Math.round(now() - postStart),
        timings = {
          memoryMs,
          kdmMs,
          aiMs: 0,
          postProcessMs,
          serverTotalMs: Math.round(now() - serverStart),
        };
      await sendChatPayload({
        sessionId,
        turnId: savedTurnId,
        requestId: requestId || undefined,
        kairaInstanceId: kairaInstance.instanceId,
        kairaInstanceType: kairaInstance.instanceType,
        reply: userFacingReply,
        activityPermission: activityPermissionPrompt,
        activityPermissionResolution: activityPermissionResolution.status,
        providerUsed: "local_language",
        localLanguage: {
          intent: local.intent,
          confidence: local.confidence,
          memory: kairaPolicy.persistentUserMemory ? languageMemorySummary(stateUserId) : undefined,
        },
        enforcement: enforced,
        speechIdentity: speech,
        kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState, semanticEvent: canonicalSemantic.event, semanticSource: canonicalSemantic.source, entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, epistemicAccess, selfMemoryRuntime, livedMemoryRuntime, behaviorContract, behaviorProfile, responsePlan, controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0, reason: "local_language_short_circuit" } },
        consistency,
        dialogue: dialogueAnalysis,
        timings,
      });
      return;
      }
    }
    const relationship = kdm.trace.relationship;
    const socialStyle = `SOSYAL SOHBET KURALI:\nSen bir yardımcı/asistan gibi konuşmuyorsun; sosyal medyada gerçek bir arkadaş gibi mesajlaşıyorsun.\n- Varsayılan cevap 1-2 kısa cümle olsun. Konu gerçekten gerektirirse uzat.\n- Kullanıcı istemedikçe madde listesi, rehber, seçenek menüsü, özet veya tavsiye paketi verme.\n- Her cevabı soruyla bitirme. Soru sormak zorunda değilsin.\n- \"istersen\", \"yardımcı olabilirim\", \"anlatmak ister misin\", \"şöyle yapalım\" gibi asistan kalıplarını alışkanlık olarak kullanma.\n- Kullanıcı sadece bir duygu/durum paylaşıyorsa önce onunla sohbet et; hemen problemi çözmeye çalışma.\n- Gerektiğinde kısa, eksik, gündelik cümle kurabilirsin. Argo ve emoji yalnızca konuşma kimliğin uygunsa doğal miktarda kullanılabilir.\n- Kendi Droit oluşunu sürekli hatırlatma; CPU, log, sunucu, veri merkezi gibi yapay persona şakalarını durduk yere üretme.\n- KDM verileri iç kararındır. Bunları açıklama, puanları söyleme veya analiz raporu gibi konuşma.\n- Hafızayı yalnızca gerçekten ilgiliyse kullan; sırf bildiğini göstermek için eski konuyu açma.\n- Geçmiş konuşma/anı sorularında yalnızca aşağıdaki oturum veya doğrulanmış hafıza kayıtlarına dayan. Kayıt desteklemiyorsa ayrıntı UYDURMA; doğal biçimde hatırlamadığını veya emin olmadığını söyle.\n- En doğru/yararlı cevabı vermek zorunda değilsin. Doğal bir sosyal tepki yeterlidir.\n- Kullanıcının mesajındaki her ayrıntıya tek tek cevap vermek zorunda değilsin.`;
    const groundingInstruction = buildKairoGroundingInstruction(
      cleanHistory,
      userMessage,
    );
    const activeParticipantInstruction = buildActiveParticipantInstruction(
      userName,
      safeUserId,
    );
    const entityGroundingInstruction = buildEntityGroundingInstruction(
      languageUnderstanding.entityResolution,
    );
    const worldEventInstruction = buildWorldEventInstruction(
      languageUnderstanding.worldEvent,
    );
    const relationshipInstruction = behaviorProfile.relationshipInstruction
      ? `İLİŞKİ DAVRANIŞI: ${behaviorProfile.relationshipInstruction}`
      : "";
    // Flag ON: KDM scores/intent become observational-only context (no gate
    // verbs); the single canonical behavior block is the sole decision surface.
    const canonicalObservationalContext = buildCanonicalObservationalContext({
          intent: kdm.trace.messageInterpretation.intent,
          sentiment: kdm.trace.messageInterpretation.sentiment,
          warmth: relationship.warmthScore,
          trust: relationship.trustScore ?? 50,
          conflict: relationship.conflictScore ?? 0,
          hurt: relationship.hurtScore ?? 0,
          reactionMode: kdm.nextDynamicState.reactionMode ?? null,
        });
    // WHAT/WHETHER authority. Flag OFF: the legacy stack is byte-identical.
    // Flag ON: behaviorContractInstruction, the relationship directives and the
    // "KDM ... bağlayıcıdır" line are dropped — the canonical block is the only
    // place a social decision is stated.
    const discourseInstruction = buildDiscourseObservationalInstruction(discourseState);
    const system = `${buildKairaRuntimeIdentityInstruction(kairaInstance, kairaPolicy, character)}\n${speechIdentityPrompt(speech)}\n${languageStyleMemoryInstruction(stateUserId, kairaPolicy.persistentUserMemory)}\
${dyadicLanguageAlignmentInstruction(stateUserId, speech.relationshipLevel, kairaPolicy.persistentUserMemory)}\n${socialStyle}\n${groundingInstruction}\n${activeParticipantInstruction}\n${entityGroundingInstruction}\n${worldEventInstruction}\n${worldEventMemoryInstruction}\n${worldStateAppraisalInstruction}\n${worldReasoningPolicyInstruction}\n${epistemicInstruction}\n${selfMemoryInstruction}\n${dialogueInstruction}\n${discourseInstruction}\n${dialogueDecisionInstruction}\n${`${responsePlanInstruction}\n${canonicalObservationalContext}`}\nAYNI OTURUM ÇALIŞMA HAFIZASI (yüksek güven):\n${sessionWorkingMemory}\nDOĞRULANMIŞ GEÇMİŞ HAFIZA:\n${memoryContext}\nTon:${behaviorProfile?.tone || "confident"}. Yalnızca Kaira'nın göndereceği doğal Türkçe mesajı üret; açıklama veya analiz ekleme.`;
    const msgs = formatKairoHistoryForModel(cleanHistory);
    msgs.push({ role: "user", content: `[${userName}]: ${userMessage}` });
    const aiStart = now();
    let reply = "";
    let providerFailureFallbackUsed = false;
    let activeAiProviderUsed: AiProviderUsed = provider === "gemini" ? "gemini" : "openrouter";
    try {
      const generated = await generateTextResult(system, msgs, 0.78, provider);
      reply = sanitizeKairoReplyText(generated.text);
      activeAiProviderUsed = generated.providerUsed;
    } catch (generationError) {
      const providerFallback = buildGroundedDialogueFallback(
        dialogueDecision,
        cleanHistory,
        userMessage,
        userName,
        dialogueAnalysis,
        responsePlan.allowQuestion,
      );
      if (!providerFallback) throw generationError;
      reply = providerFallback;
      providerFailureFallbackUsed = true;
      activeAiProviderUsed = "deterministic_fallback";
    }
    let groundingIssues = [
      ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
      ...findDialogueAttributionIssues(
        reply,
        cleanHistory,
        userMessage,
        userName,
        dialogueAnalysis,
      ),
      ...findDialogueDecisionIssues(
        reply,
        dialogueDecision,
        dialogueOutputStyle,
      ),
      ...findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
      ...findKairaResponsePlanIssues(reply, responsePlan),
      ...findKairoAffectiveResponseIssues(reply, kdm.trace),
      ...findWorldModelResponseIssues(reply, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
    ];
    let repairAttempts = 0;
    if (groundingIssues.length && now() - aiStart < 24000) {
      try {
        repairAttempts = 1;
        const repairedGeneration = await Promise.race([
          generateTextResult(
            `${system}\nDÜZELTME KAPISI: Önceki taslak şu nedenle reddedildi: ${groundingIssues.join("; ")}. Aynı doğal konuşma tonunu koruyarak yalnızca bu hataları düzelt.`,
            msgs,
            0.35,
            provider,
          ),
          sleep<GeneratedTextResult | null>(8000, null),
        ]);
        if (!repairedGeneration?.text.trim()) throw new Error("KDM onarım zaman aşımı");
        const repairedReply = sanitizeKairoReplyText(repairedGeneration.text);
        const repairedIssues = [
          ...findKairoTranscriptEchoIssues(repairedReply),
          ...findKairoGroundingIssues(repairedReply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(
            repairedReply,
            cleanHistory,
            userMessage,
            userName,
            dialogueAnalysis,
          ),
          ...findDialogueDecisionIssues(
            repairedReply,
            dialogueDecision,
            dialogueOutputStyle,
          ),
          ...findKairoResponseRhythmIssues(repairedReply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
          ...findKairaResponsePlanIssues(repairedReply, responsePlan),
          ...findKairoAffectiveResponseIssues(repairedReply, kdm.trace),
          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
        ];
        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
          activeAiProviderUsed = repairedGeneration.providerUsed;
          providerFailureFallbackUsed = false;
        }
      } catch {
        // İlk geçerli yanıtı koru; onarım çağrısının geçici model hatası sohbeti düşürmesin.
      }
    }
    if (groundingIssues.length) {
      const fallback = buildGroundedDialogueFallback(
        dialogueDecision,
        cleanHistory,
        userMessage,
        userName,
        dialogueAnalysis,
        responsePlan.allowQuestion,
      );
      if (fallback) {
        const fallbackIssues = [
          ...findKairoGroundingIssues(fallback, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(
            fallback,
            cleanHistory,
            userMessage,
            userName,
            dialogueAnalysis,
          ),
          ...findDialogueDecisionIssues(
            fallback,
            dialogueDecision,
            dialogueOutputStyle,
          ),
          ...findKairoResponseRhythmIssues(fallback, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
          ...findKairaResponsePlanIssues(fallback, responsePlan),
          ...findKairoAffectiveResponseIssues(fallback, kdm.trace),
          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
        ];
        if (fallbackIssues.length < groundingIssues.length) {
          reply = fallback;
          groundingIssues = fallbackIssues;
        }
      }
    }
    const canonicalConstraint = runKairaResponseConstraintPass({
          reply,
          trace: kdm.trace,
          plan: responsePlan,
          worldItems: retrievedWorldEvents,
          worldContext: worldReasoningContext,
          selfMemoryRuntime,
          epistemicContext: epistemicAccess,
          additionalIssueFinder: (candidateReply) => [
            ...findKairoTranscriptEchoIssues(candidateReply),
            ...findKairoGroundingIssues(candidateReply, cleanHistory, userMessage),
            ...findDialogueAttributionIssues(candidateReply, cleanHistory, userMessage, userName, dialogueAnalysis),
            ...findDialogueDecisionIssues(candidateReply, dialogueDecision, dialogueOutputStyle),
            ...findKairoResponseRhythmIssues(candidateReply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
          ],
          fallbackFactory: () =>
            buildGroundedDialogueFallback(
              dialogueDecision,
              cleanHistory,
              userMessage,
              userName,
              dialogueAnalysis,
              responsePlan.allowQuestion,
            ),
        });
    const worldMemoryGuard = canonicalConstraint?.worldGuard ?? enforceWorldModelRecallResponse(reply, retrievedWorldEvents, worldReasoningContext);
    if (!canonicalConstraint && worldMemoryGuard.changed) {
      reply = worldMemoryGuard.reply;
      groundingIssues = [
        ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
        ...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName, dialogueAnalysis),
        ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),
        ...findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
        ...findKairaResponsePlanIssues(reply, responsePlan),
        ...findKairoAffectiveResponseIssues(reply, kdm.trace),
        ...findWorldModelResponseIssues(reply, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
      ];
    }
    const selfMemoryGuard = canonicalConstraint?.autobiographicalGuard ?? enforceKairaAutobiographicalResponse(reply, selfMemoryRuntime);
    reply = canonicalConstraint?.reply ?? selfMemoryGuard.reply;
    const epistemicGuard = canonicalConstraint?.epistemicGuard ?? enforceKairaEpistemicResponse(reply, epistemicAccess);
    reply = canonicalConstraint?.reply ?? epistemicGuard.reply;
    const baseEnforced = canonicalConstraint?.planEnforcement ?? enforceKairoResponse(reply, kdm.trace, enforcementRules);
    const contractEnforced = canonicalConstraint
      ? { reply: canonicalConstraint.reply, changed: false, reasons: [] as string[] }
      : enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);
    const enforced = canonicalConstraint
      ? {
          reply: canonicalConstraint.reply,
          changed: canonicalConstraint.changed,
          reasons: canonicalConstraint.reasons,
        }
      : {
          reply: contractEnforced.reply,
          changed: worldMemoryGuard.changed || selfMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,
          reasons: [
            ...baseEnforced.reasons,
            ...contractEnforced.reasons,
            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
            ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),
          ],
        };
    reply = canonicalConstraint?.reply ?? enforced.reply;
    let postEnforcementPlanIssues = canonicalConstraint?.issues ?? findKairaResponsePlanIssues(reply, responsePlan);
    if (!canonicalConstraint && postEnforcementPlanIssues.length) {
      const planSafeFallback = buildGroundedDialogueFallback(
        dialogueDecision, cleanHistory, userMessage, userName, dialogueAnalysis, responsePlan.allowQuestion,
      );
      if (planSafeFallback) {
        const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents, worldReasoningContext);
        const candidateSelfMemoryGuard = enforceKairaAutobiographicalResponse(candidateWorldGuard.reply, selfMemoryRuntime);
        const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateSelfMemoryGuard.reply, epistemicAccess);
        const candidateBaseEnforced = enforceKairoResponse(candidateEpistemicGuard.reply, kdm.trace, enforcementRules);
        const candidateContractEnforced = enforceBehaviorContract(candidateBaseEnforced.reply, kdm.trace, behaviorContract);
        const candidateReply = candidateContractEnforced.reply;
        const planSafeIssues = [
          ...findKairoGroundingIssues(candidateReply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(candidateReply, cleanHistory, userMessage, userName, dialogueAnalysis),
          ...findDialogueDecisionIssues(candidateReply, dialogueDecision, dialogueOutputStyle),
          ...findKairoResponseRhythmIssues(candidateReply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
          ...findKairaResponsePlanIssues(candidateReply, responsePlan),
          ...findKairoAffectiveResponseIssues(candidateReply, kdm.trace),
          ...findWorldModelResponseIssues(candidateReply, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
          ...findKairaEpistemicResponseIssues(candidateReply, epistemicAccess),
        ];
        if (planSafeIssues.length === 0) {
          reply = candidateReply;
          postEnforcementPlanIssues = [];
          enforced.changed = true;
          enforced.reasons.push(
            "response_plan_delivery_fallback",
            ...(candidateWorldGuard.reason ? [candidateWorldGuard.reason] : []),
            ...(candidateEpistemicGuard.reason ? [candidateEpistemicGuard.reason] : []),
            ...candidateBaseEnforced.reasons,
            ...candidateContractEnforced.reasons,
          );
        }
      }
    }
    const aiMs = Math.round(now() - aiStart);
    const canonicalExternalIssues = canonicalConstraint
      ? [
          ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName, dialogueAnalysis),
          ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),
          ...findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
        ]
      : [];
    const baseConsistency = canonicalConstraint?.consistency ?? validateKairoResponse(reply, kdm.trace);
    const finalPlanIssues = postEnforcementPlanIssues;
    const finalEpistemicIssues = canonicalConstraint ? [] : findKairaEpistemicResponseIssues(reply, epistemicAccess);
    const finalIssues = canonicalConstraint
      ? [...new Set([...canonicalExternalIssues, ...finalPlanIssues])]
      : [...new Set([...groundingIssues, ...finalPlanIssues, ...finalEpistemicIssues])];
    const consistency = canonicalConstraint
      ? {
          ...canonicalConstraint.consistency,
          accepted: canonicalConstraint.consistency.accepted && finalIssues.length === 0,
          score: Math.max(0, canonicalConstraint.consistency.score - finalIssues.length * 15),
          issues: [...new Set([...canonicalConstraint.consistency.issues, ...finalIssues])],
          warnings: enforced.reasons,
        }
      : {
          ...baseConsistency,
          accepted: baseConsistency.accepted && finalIssues.length === 0,
          score: Math.max(0, baseConsistency.score - finalIssues.length * 15),
          issues: [...baseConsistency.issues, ...finalIssues],
          warnings: enforced.reasons,
        };
    if (kairaPolicy.persistentUserMemory && consistency.accepted && !providerFailureFallbackUsed) {
      learnLanguageReply(stateUserId, reply);
    }
    reply = await attachActivityPermission(reply);
    const postStart = now();
    const livedMemoryRuntime = await persistWorldEventAndMaybeConsolidateLivedMemory({
      userId,
      instance: kairaInstance,
      sessionId,
      speakerName: userName,
      event: languageUnderstanding.worldEvent,
      dynamicStateAfter: kdm.nextDynamicState,
    });
    let savedTurnId = "";
    await Promise.allSettled([
      kairaPolicy.persistentRelationship ? saveKdmInteraction({
        userId: stateUserId,
        dynamicState: kdm.nextDynamicState,
        reasoningTrace: kdm.trace,
        lastUserMessage: userMessage,
        reply,
        memoryScope: kairaPolicy.persistentUserMemory ? dialogueAnalysis.memoryScope : "session",
        dialogueAnalysis,
          semanticInterpretation: canonicalSemantic.interpretation,
      }) : Promise.resolve(),
      recordKdmMetric({
        userId: stateUserId,
        score: consistency.score,
        accepted: consistency.accepted,
        repaired: repairAttempts > 0 && groundingIssues.length === 0,
        repairAttempts,
        issues: consistency.issues,
      }),
      saveKntTrace({
        userId: stateUserId,
        userMessage,
        reply,
        reasoningTrace: kdm.trace,
        dynamicState: kdm.nextDynamicState,
        timings: { memoryMs, kdmMs, aiMs, postProcessMs: 0, serverTotalMs: 0 },
        providerUsed: activeAiProviderUsed,
        semanticInterpretation: canonicalSemantic.interpretation,
        semanticEvent: canonicalSemantic.event,
        semanticSource: canonicalSemantic.source,
        languageStyleMemory,
        controlledSpontaneity: spontaneityDecision,
        speechIdentity: speech,
        worldStateAppraisal,
        worldReasoningPolicy,
        worldMemoryGuard,
        epistemicAccess,
        selfMemoryRuntime,
        livedMemoryRuntime,
        responsePlan,
      }),
      saveTestSessionTurn({
        sessionId,
        userId: stateUserId,
        userName,
        userMessage,
        assistantReply: reply,
        speaker: userName,
        intent: kdm.trace?.messageInterpretation?.intent,
        detectedEmotion: kdm.trace?.messageInterpretation?.sentiment,
        reasoningTrace: kdm.trace,
        kdmResult: {
          chosenTone: kdm.trace?.decision?.chosenTone,
          explanation: kdm.trace?.decision?.explanation,
          score: consistency.score,
          decision: kdm.trace?.decision,
        },
        activationValues: {
          calmness: kdm.nextDynamicState.calmness,
          anger: kdm.nextDynamicState.anger,
          stress: kdm.nextDynamicState.stress,
          happiness: kdm.nextDynamicState.happiness,
          confidence: kdm.nextDynamicState.confidence,
          surprise: kdm.nextDynamicState.surprise,
          deltas: kdm.nextDynamicState.lastEvent?.deltas || [],
        },
        dynamicStateBefore: effective,
        dynamicStateAfter: kdm.nextDynamicState,
        relationshipState:
          kdm.nextDynamicState.relationship || kdm.trace.relationship,
        retrievedMemories: validatedMemory,
        memoryUpdate: kdm.trace?.memoryUpdate,
        consistency: {
          accepted: consistency.accepted,
          score: consistency.score,
          issues: consistency.issues,
          warnings: enforced.reasons,
        },
        metadata: {
          semanticInterpretation: canonicalSemantic.interpretation,
        semanticEvent: canonicalSemantic.event,
          semanticSource: canonicalSemantic.source,
          providerUsed: activeAiProviderUsed,
          languageStyleMemory,
          controlledSpontaneity: spontaneityDecision,
          speechIdentity: speech,
          entityResolution: languageUnderstanding.entityResolution,
          worldEvent: languageUnderstanding.worldEvent,
          retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),
          worldStateAppraisal,
          worldReasoningPolicy,
          worldMemoryGuard,
          epistemicAccess,
          selfMemoryRuntime,
          livedMemoryRuntime,
          responsePlan,
          timings: { memoryMs, kdmMs, aiMs },
          activityPermission: activityPermissionPrompt,
        },
      }).then((t) => {
        savedTurnId = t.turnId;
      }),
    ]);
    const autonomousStateSourceId = requestId
      ? `chat_request:${requestId}`
      : savedTurnId
        ? `chat_turn:${savedTurnId}`
        : "";
    if (kairaPolicy.autonomousActivityPlanning && autonomousStateSourceId) {
      await Promise.allSettled([
        observeKairaActivityDynamicState({
          ownerUserId: String(userId),
          kairaInstanceId: kairaInstance.instanceId,
          instanceType: kairaInstance.instanceType,
          state: kdm.nextDynamicState,
          observedAt: new Date().toISOString(),
          sourceId: autonomousStateSourceId,
        }),
      ]);
    }
    memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));
    const postProcessMs = Math.round(now() - postStart),
      timings = {
        memoryMs,
        kdmMs,
        aiMs,
        postProcessMs,
        serverTotalMs: Math.round(now() - serverStart),
      };
    await sendChatPayload({
      sessionId,
      turnId: savedTurnId,
      requestId: requestId || undefined,
      kairaInstanceId: kairaInstance.instanceId,
      kairaInstanceType: kairaInstance.instanceType,
      reply,
      activityPermission: activityPermissionPrompt,
      activityPermissionResolution: activityPermissionResolution.status,
      providerUsed: activeAiProviderUsed,
      enforcement: enforced,
      speechIdentity: speech,
      kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState, semanticEvent: canonicalSemantic.event, semanticSource: canonicalSemantic.source, entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, epistemicAccess, selfMemoryRuntime, livedMemoryRuntime, behaviorContract, behaviorProfile, responsePlan, controlledSpontaneity: spontaneityDecision },
      consistency,
      dialogue: dialogueAnalysis,
      dialogueDecision,
      timings,
    });
  } catch (e: any) {
    console.error(e);
    if (idempotencyKey && ownsIdempotencyClaim) {
      await failCoordinatedKairaChatRequest(idempotencyKey, e);
      ownsIdempotencyClaim = false;
    }
    if (!res.headersSent)
      res.status(500).json({ error: e?.message || "Chat service failed" });
  }
});
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`NEXUS Kairo Studio running on http://0.0.0.0:${PORT}`),
  );
}
startServer();