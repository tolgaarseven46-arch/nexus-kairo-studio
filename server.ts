import express from "express";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { analyzeKdmInteraction } from "./src/services/kdmConsistencyEngine";
import { resolveServerLanguageUnderstanding } from "./src/services/serverLanguageUnderstanding";
import { applyConversationStateAuthority } from "./src/services/conversationStateAuthority";
import { buildBehaviorContract, behaviorContractInstruction } from "./src/services/behaviorContract";
import { enforceBehaviorContract } from "./src/services/behaviorContractEnforcer";
import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./src/services/kairaResponsePlan";
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
import {
  enforceKairoResponse,
  validateKairoResponse,
} from "./src/services/kairoResponseConsistency";
import {
  buildActiveParticipantInstruction,
  buildKairoGroundingInstruction,
  findKairoGroundingIssues,
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
import { saveWorldEventObservation, loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";
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
} from "./src/services/kairoLanguageMemory";
import {
  instancePolicy,
  memoryCacheKey,
  resolveKairaInstanceContext,
  stateOwnerScope,
  type KairaInstanceType,
} from "./src/services/kairaInstanceContext";
import type {
  DroitDynamicState,
  DroitPersonalityTraits,
} from "./src/types/nexus";
dotenv.config();
const app = express(),
  PORT = 3000;
app.use(express.json());
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
let activeAiProviderUsed = "gemini";
async function generateText(
  system: string,
  messages: any[],
  temperature: number,
  preferredProvider: string,
): Promise<string> {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (preferredProvider === "openrouter" && hasOpenRouter) {
    try {
      const text = await callOpenRouter(
        [{ role: "system", content: system }, ...messages],
        temperature,
      );
      activeAiProviderUsed = "openrouter";
      return text;
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
        activeAiProviderUsed = "gemini";
        return (response?.text || "").trim();
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
    activeAiProviderUsed = "gemini";
    return (response?.text || "").trim();
  }

  if (hasOpenRouter) {
    const text = await callOpenRouter(
      [{ role: "system", content: system }, ...messages],
      temperature,
    );
    activeAiProviderUsed = "openrouter";
    return text;
  }

  throw new Error("Yapay zeka anahtarı (GEMINI_API_KEY veya OPENROUTER_API_KEY) bulunamadı.");
}
async function getFastRecentMemory(userId: string, kairaInstanceId: string) {
  const cacheKey = memoryCacheKey(userId, kairaInstanceId);
  const c = memoryCache.get(cacheKey);
  if (c && c.expires > Date.now()) return c.items;
  const scopedUserId = stateOwnerScope(userId, kairaInstanceId);
  const loader = loadRecentKdmMemory(6, scopedUserId)
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
  const scopedUserId = stateOwnerScope(userId, instance.instanceId);
  await hydrateLanguageMemory(scopedUserId);
  r.json({ ok: true, userId, kairaInstanceId: instance.instanceId, ...languageMemorySummary(scopedUserId) });
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
function runtimeFlag(personality: DroitPersonalityTraits, key: string, fallback = true) {
  const value = personality?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value >= 50;
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
  try {
    const {
      userId = "anonymous",
      userName = "Kullanıcı",
      userMessage,
      character = {},
      personality = {},
      history = [],
      dynamicState = defaultDynamicState,
      provider = "openrouter",
      suppressRecentMemory = false,
      semanticEvent: incomingSemanticEvent,
      sessionId: incomingSessionId,
      kairaInstanceId: incomingKairaInstanceId,
      kairaInstanceType: incomingKairaInstanceType,
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
    const cleanHistory = sanitizeKairoChatHistory(history);
    const retrievedWorldEvents = kairaPolicy.persistentWorldModel && shouldRetrieveWorldEvents(userMessage)
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
    const worldReasoningPolicyInstruction = buildWorldReasoningPolicyInstruction(worldReasoningPolicy);
    const languageUnderstanding = await resolveServerLanguageUnderstanding({
      message: userMessage,
      incomingSemanticEvent,
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
      event: languageUnderstanding.event,
      source: languageUnderstanding.semanticSource,
    };
    const dialogueAnalysis = projectSemanticEventToDialogueAnalysis(languageUnderstanding.event);
    const dialogueInstruction = buildDialogueBoardInstruction(
      cleanHistory,
      userMessage,
      userName,
      dialogueAnalysis,
    );
    const dialogueDecision = planDialogueResponse(
      cleanHistory,
      userMessage,
      userName,
      languageUnderstanding.event,
      dialogueAnalysis,
    );
    const dialogueDecisionInstruction =
      buildDialogueDecisionInstruction(dialogueDecision);
    const memoryStart = now();
    const [persistedState, persistentMemory] = await Promise.all([
      kairaPolicy.persistentRelationship ? loadKdmState(stateUserId).catch(() => null) : Promise.resolve(null),
      suppressRecentMemory || !kairaPolicy.persistentUserMemory ? Promise.resolve([]) : getFastRecentMemory(userId, kairaInstance.instanceId),
      kairaPolicy.persistentUserMemory ? hydrateLanguageMemory(stateUserId) : Promise.resolve(),
    ]);
    const memoryMs = Math.round(now() - memoryStart),
      requestState = normalizeDynamicState(dynamicState),
      effective = dynamicState?.relationship
        ? requestState
        : normalizeDynamicState(persistedState ?? dynamicState),
      safePersonality = personality as DroitPersonalityTraits,
      kdmStart = now(),
      kdm = analyzeKdmInteraction(
        userMessage,
        safePersonality,
        effective,
        canonicalSemantic.event,
      ),
      conversationAuthority = applyConversationStateAuthority(safePersonality, kdm.nextDynamicState),
      authoritativePersonality = conversationAuthority.personality,
      behaviorContract = buildBehaviorContract(kdm.nextDynamicState, kdm.trace),
      behaviorProfile = kdm.behaviorProfile,
      speech = computeKairoSpeechIdentity(
        authoritativePersonality,
        kdm.nextDynamicState,
        kdm.trace,
      ),
      responsePlan = buildKairaResponsePlan(behaviorContract, dialogueDecision, speech),
      responsePlanInstruction = kairaResponsePlanInstruction(responsePlan),
      enforcementRules = {
        continueConversation: behaviorContract.continueConversation && runtimeFlag(authoritativePersonality, "runtimeContinueConversation", true),
        humorAllowed: behaviorContract.playfulness === "allowed" && runtimeFlag(authoritativePersonality, "runtimeHumorAllowed", true),
        askQuestion: behaviorContract.questions === "allowed" && runtimeFlag(authoritativePersonality, "runtimeAskQuestion", true),
        behaviorContract,
        emojiLevel: speech.emojiLevel,
        conversationState: kdm.nextDynamicState.relationship?.conversationState,
      },
      dialogueOutputStyle = {
        emojiLevel: speech.emojiLevel,
        userMessage,
      },
      local = tryLocalKairoReply(
        userMessage,
        authoritativePersonality,
        kdm.nextDynamicState,
        kdm.trace,
        stateUserId,
        dialogueDecision.move,
        responsePlan,
        languageUnderstanding.event,
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
    if (local.handled && local.reply) {
      const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents),
        baseEnforced = enforceKairoResponse(worldMemoryGuard.reply, kdm.trace, enforcementRules),
        contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract),
        enforced = {
          reply: contractEnforced.reply,
          changed: worldMemoryGuard.changed || baseEnforced.changed || contractEnforced.changed,
          reasons: [
            ...baseEnforced.reasons,
            ...contractEnforced.reasons,
            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
          ],
        },
        reply = enforced.reply,
        localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan),
        localBaseConsistency = validateKairoResponse(reply, kdm.trace),
        consistency = {
          ...localBaseConsistency,
          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0,
          score: Math.max(0, localBaseConsistency.score - localPlanIssues.length * 15),
          issues: [...localBaseConsistency.issues, ...localPlanIssues],
        },
        postStart = now();
      let savedTurnId = "";
      await Promise.allSettled([
        kairaPolicy.persistentWorldModel ? saveWorldEventObservation({
          userId,
          kairaInstanceId: kairaInstance.instanceId,
          sessionId,
          speakerName: userName,
          event: languageUnderstanding.worldEvent,
        }) : Promise.resolve(),
        kairaPolicy.persistentRelationship ? saveKdmInteraction({
          userId: stateUserId,
          dynamicState: kdm.nextDynamicState,
          reasoningTrace: kdm.trace,
          lastUserMessage: userMessage,
          reply,
          memoryScope: kairaPolicy.persistentUserMemory ? dialogueAnalysis.memoryScope : "session",
          dialogueAnalysis,
        }) : Promise.resolve(),
        saveKntTrace({
          userId: stateUserId,
          userMessage,
          reply,
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
          speechIdentity: speech,
          worldStateAppraisal,
          worldReasoningPolicy,
          worldMemoryGuard,
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
          dynamicStateBefore: requestState,
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
            providerUsed: "local_language",
            speechIdentity: speech,
            entityResolution: languageUnderstanding.entityResolution,
            worldEvent: languageUnderstanding.worldEvent,
            retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),
            worldStateAppraisal,
            worldReasoningPolicy,
            worldMemoryGuard,
            responsePlan,
            timings: { memoryMs, kdmMs, aiMs: 0 },
          },
        }).then((t) => {
          savedTurnId = t.turnId;
        }),
      ]);
      memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));
      const postProcessMs = Math.round(now() - postStart),
        timings = {
          memoryMs,
          kdmMs,
          aiMs: 0,
          postProcessMs,
          serverTotalMs: Math.round(now() - serverStart),
        };
      res.json({
        sessionId,
        turnId: savedTurnId,
        kairaInstanceId: kairaInstance.instanceId,
        kairaInstanceType: kairaInstance.instanceType,
        reply,
        providerUsed: "local_language",
        localLanguage: {
          intent: local.intent,
          confidence: local.confidence,
          memory: kairaPolicy.persistentUserMemory ? languageMemorySummary(stateUserId) : undefined,
        },
        enforcement: enforced,
        speechIdentity: speech,
        kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState, semanticEvent: canonicalSemantic.event, semanticSource: canonicalSemantic.source, entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, conversationAuthority: { state: conversationAuthority.state, locked: conversationAuthority.locked, reason: conversationAuthority.reason } },
        consistency,
        dialogue: dialogueAnalysis,
        timings,
      });
      return;
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
    const system = `Sen ${character.name || "KAIRO"} adlı Droit'sun. ${speechIdentityPrompt(speech)}\n${socialStyle}\n${groundingInstruction}\n${activeParticipantInstruction}\n${entityGroundingInstruction}\n${worldEventInstruction}\n${worldEventMemoryInstruction}\n${worldStateAppraisalInstruction}\n${worldReasoningPolicyInstruction}\n${dialogueInstruction}\n${dialogueDecisionInstruction}\n${relationshipInstruction}\n${behaviorContractInstruction(behaviorContract)}\n${responsePlanInstruction}\nKDM: niyet=${kdm.trace.messageInterpretation.intent}, duygu=${kdm.trace.messageInterpretation.sentiment}, sıcaklık=${relationship.warmthScore}, güven=${relationship.trustScore ?? 50}, çatışma=${relationship.conflictScore ?? 0}, kırgınlık=${relationship.hurtScore ?? 0}, karar=${kdm.trace.decision.chosenTone}. Bu davranış kararları bağlayıcıdır; soru/mizah/mesafe/konuşmayı sürdürme sınırlarını ihlal etme.\nAYNI OTURUM ÇALIŞMA HAFIZASI (yüksek güven):\n${sessionWorkingMemory}\nDOĞRULANMIŞ GEÇMİŞ HAFIZA:\n${memoryContext}\nTon:${behaviorProfile?.tone || "confident"}. Yalnızca Kaira'nın göndereceği doğal Türkçe mesajı üret; açıklama veya analiz ekleme.`;
    const msgs = formatKairoHistoryForModel(cleanHistory);
    msgs.push({ role: "user", content: `[${userName}]: ${userMessage}` });
    const aiStart = now();
    let reply = sanitizeKairoReplyText(
      await generateText(system, msgs, 0.78, provider),
    );
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
      ...findKairaResponsePlanIssues(reply, responsePlan),
      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),
    ];
    let repairAttempts = 0;
    if (groundingIssues.length && now() - aiStart < 24000) {
      try {
        repairAttempts = 1;
        const repairedReply = sanitizeKairoReplyText(
          await Promise.race([
            generateText(
              `${system}\nDÜZELTME KAPISI: Önceki taslak şu nedenle reddedildi: ${groundingIssues.join("; ")}. Aynı doğal konuşma tonunu koruyarak yalnızca bu hataları düzelt.`,
              msgs,
              0.35,
              provider,
            ),
            sleep(8000, ""),
          ]),
        );
        if (!repairedReply.trim()) throw new Error("KDM onarım zaman aşımı");
        const repairedIssues = [
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
          ...findKairaResponsePlanIssues(repairedReply, responsePlan),
          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),
        ];
        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
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
          ...findKairaResponsePlanIssues(fallback, responsePlan),
          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),
        ];
        if (fallbackIssues.length < groundingIssues.length) {
          reply = fallback;
          groundingIssues = fallbackIssues;
        }
      }
    }
    const worldMemoryGuard = enforceWorldModelRecallResponse(reply, retrievedWorldEvents);
    if (worldMemoryGuard.changed) {
      reply = worldMemoryGuard.reply;
      groundingIssues = [
        ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
        ...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName, dialogueAnalysis),
        ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),
        ...findKairaResponsePlanIssues(reply, responsePlan),
      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),
      ];
    }
    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);
    const contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);
    const enforced = {
      reply: contractEnforced.reply,
      changed: worldMemoryGuard.changed || baseEnforced.changed || contractEnforced.changed,
      reasons: [
        ...baseEnforced.reasons,
        ...contractEnforced.reasons,
        ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
      ],
    };
    reply = enforced.reply;
    const aiMs = Math.round(now() - aiStart);
    const baseConsistency = validateKairoResponse(reply, kdm.trace);
    const finalPlanIssues = findKairaResponsePlanIssues(reply, responsePlan);
    const finalIssues = [...new Set([...groundingIssues, ...finalPlanIssues])];
    const consistency = {
      ...baseConsistency,
      accepted: baseConsistency.accepted && finalIssues.length === 0,
      score: Math.max(0, baseConsistency.score - finalIssues.length * 15),
      issues: [...baseConsistency.issues, ...finalIssues],
      warnings: enforced.reasons,
    };
    const postStart = now();
    let savedTurnId = "";
    await Promise.allSettled([
      kairaPolicy.persistentWorldModel ? saveWorldEventObservation({
        userId,
        kairaInstanceId: kairaInstance.instanceId,
        sessionId,
        speakerName: userName,
        event: languageUnderstanding.worldEvent,
      }) : Promise.resolve(),
      kairaPolicy.persistentRelationship ? saveKdmInteraction({
        userId: stateUserId,
        dynamicState: kdm.nextDynamicState,
        reasoningTrace: kdm.trace,
        lastUserMessage: userMessage,
        reply,
        memoryScope: kairaPolicy.persistentUserMemory ? dialogueAnalysis.memoryScope : "session",
        dialogueAnalysis,
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
        speechIdentity: speech,
        worldStateAppraisal,
        worldReasoningPolicy,
        worldMemoryGuard,
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
        dynamicStateBefore: requestState,
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
          providerUsed: activeAiProviderUsed,
          speechIdentity: speech,
          entityResolution: languageUnderstanding.entityResolution,
          worldEvent: languageUnderstanding.worldEvent,
          retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),
          worldStateAppraisal,
          worldReasoningPolicy,
          worldMemoryGuard,
          responsePlan,
          timings: { memoryMs, kdmMs, aiMs },
        },
      }).then((t) => {
        savedTurnId = t.turnId;
      }),
    ]);
    memoryCache.delete(memoryCacheKey(userId, kairaInstance.instanceId));
    const postProcessMs = Math.round(now() - postStart),
      timings = {
        memoryMs,
        kdmMs,
        aiMs,
        postProcessMs,
        serverTotalMs: Math.round(now() - serverStart),
      };
    res.json({
      sessionId,
      turnId: savedTurnId,
      kairaInstanceId: kairaInstance.instanceId,
      kairaInstanceType: kairaInstance.instanceType,
      reply,
      providerUsed: activeAiProviderUsed,
      enforcement: enforced,
      speechIdentity: speech,
      kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState, semanticEvent: canonicalSemantic.event, semanticSource: canonicalSemantic.source, entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, conversationAuthority: { state: conversationAuthority.state, locked: conversationAuthority.locked, reason: conversationAuthority.reason } },
      consistency,
      dialogue: dialogueAnalysis,
      dialogueDecision,
      timings,
    });
  } catch (e: any) {
    console.error(e);
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
