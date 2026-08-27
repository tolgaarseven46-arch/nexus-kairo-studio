import express from "express";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { analyzeKdmInteraction } from "./src/services/kdmConsistencyEngine";
import {
  loadKdmState,
  loadRecentKdmMemory,
  saveKdmInteraction,
  saveKntTrace,
  loadRecentKntTraces,
} from "./src/services/kdmPersistenceService";
import { validateMemoryAgainstMessage } from "./src/services/kairoMemoryConsistency";
import { validateKairoResponse } from "./src/services/kairoResponseConsistency";
import {
  buildKairoGroundingInstruction,
  findKairoGroundingIssues,
} from "./src/services/kairoConversationGrounding";
import { recordKdmMetric } from "./src/services/kdmMetricsService";
import {
  computeKairoSpeechIdentity,
  speechIdentityPrompt,
} from "./src/services/kairoSpeechIdentity";
import { applyRelationshipContext } from "./src/services/relationshipBehaviorService";
import { tryLocalKairoReply } from "./src/services/kairoLocalLanguageEngine";
import {
  hydrateLanguageMemory,
  languageMemorySummary,
} from "./src/services/kairoLanguageMemory";
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
    { expires: number; items: Array<{ userMessage: string; reply: string }> }
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
  return typeof d === "string" ? d.trim() : "";
}
async function callOpenRouter(messages: any[], temperature: number) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY bulunamadı.");
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
          model: process.env.OPENROUTER_MODEL || "openrouter/free",
          messages,
          temperature,
          max_tokens: 180,
        }),
      },
    ),
    data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data?.error?.message || `OpenRouter hatası: HTTP ${response.status}`,
    );
  const text = extractOpenRouterText(data);
  if (!text) throw new Error("OpenRouter boş yanıt döndürdü.");
  return text;
}
async function generateText(
  system: string,
  messages: any[],
  temperature: number,
  provider: string,
) {
  if (provider === "openrouter")
    return callOpenRouter(
      [{ role: "system", content: system }, ...messages],
      temperature,
    );
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-3.6-flash",
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: { systemInstruction: system },
  });
  return (response?.text || "").trim();
}
async function getFastRecentMemory(userId: string) {
  const c = memoryCache.get(userId);
  if (c && c.expires > Date.now()) return c.items;
  const loader = loadRecentKdmMemory(6, userId)
    .then(
      (items) => (
        memoryCache.set(userId, { expires: Date.now() + MEMORY_TTL_MS, items }),
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
        `${x.item.sender === "user" ? "Kullanıcı" : "Kaira"}: ${String(x.item.text || "").slice(0, 320)}`,
    )
    .join("\n");
}
app.get("/api/health", (_q, r) =>
  r.json({ status: "ok", timestamp: new Date().toISOString() }),
);
app.get("/api/knt/traces", async (q, r) => {
  try {
    const userId =
        typeof q.query.userId === "string" ? q.query.userId : "test_user_x",
      traces = await loadRecentKntTraces(Number(q.query.limit || 20), userId);
    r.json({ ok: true, userId, count: traces.length, traces });
  } catch (e: any) {
    r.status(500).json({ ok: false, error: e?.message });
  }
});
app.get("/api/kaira/language-memory", async (q, r) => {
  const userId =
    typeof q.query.userId === "string" ? q.query.userId : "test_user_x";
  await hydrateLanguageMemory(userId);
  r.json({ ok: true, userId, ...languageMemorySummary(userId) });
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
app.post("/api/chat", async (req, res) => {
  const serverStart = now();
  try {
    const {
      userId = "anonymous",
      userMessage,
      character = {},
      personality = {},
      behaviorProfile: baseBehaviorProfile,
      history = [],
      dynamicState = defaultDynamicState,
      provider = "openrouter",
      suppressRecentMemory = false,
    } = req.body;
    if (!userMessage)
      return res.status(400).json({ error: "userMessage is required" });
    const memoryStart = now();
    const [persistedState, persistentMemory] = await Promise.all([
      loadKdmState(userId).catch(() => null),
      suppressRecentMemory ? Promise.resolve([]) : getFastRecentMemory(userId),
      hydrateLanguageMemory(userId),
    ]);
    const memoryMs = Math.round(now() - memoryStart),
      requestState = normalizeDynamicState(dynamicState),
      effective = dynamicState?.relationship
        ? requestState
        : normalizeDynamicState(persistedState ?? dynamicState),
      behaviorProfile = applyRelationshipContext(
        baseBehaviorProfile,
        effective,
      ),
      safePersonality = personality as DroitPersonalityTraits,
      kdmStart = now(),
      kdm = analyzeKdmInteraction(
        normalizeKdmSemanticAliases(userMessage),
        safePersonality,
        effective,
      ),
      speech = computeKairoSpeechIdentity(
        safePersonality,
        kdm.nextDynamicState,
        kdm.trace,
      ),
      local = tryLocalKairoReply(
        userMessage,
        safePersonality,
        kdm.nextDynamicState,
        kdm.trace,
        userId,
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
          .map((x: any) => `Kullanıcı: ${x.userMessage}\nKairo: ${x.reply}`)
          .join("\n") || "İlgili doğrulanmış anı yok.",
      sessionWorkingMemory = buildSessionWorkingMemory(history, userMessage);
    if (local.handled && local.reply) {
      const reply = local.reply,
        consistency = validateKairoResponse(reply, kdm.trace),
        postStart = now();
      await Promise.allSettled([
        saveKdmInteraction({
          userId,
          dynamicState: kdm.nextDynamicState,
          reasoningTrace: kdm.trace,
          lastUserMessage: userMessage,
          reply,
        }),
        saveKntTrace({
          userId,
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
        }),
      ]);
      memoryCache.delete(userId);
      const postProcessMs = Math.round(now() - postStart),
        timings = {
          memoryMs,
          kdmMs,
          aiMs: 0,
          postProcessMs,
          serverTotalMs: Math.round(now() - serverStart),
        };
      res.json({
        reply,
        providerUsed: "local_language",
        localLanguage: {
          intent: local.intent,
          confidence: local.confidence,
          memory: languageMemorySummary(userId),
        },
        speechIdentity: speech,
        kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState },
        consistency,
        timings,
      });
      return;
    }
    const relationship = kdm.trace.relationship;
    const socialStyle = `SOSYAL SOHBET KURALI:\nSen bir yardımcı/asistan gibi konuşmuyorsun; sosyal medyada gerçek bir arkadaş gibi mesajlaşıyorsun.\n- Varsayılan cevap 1-2 kısa cümle olsun. Konu gerçekten gerektirirse uzat.\n- Kullanıcı istemedikçe madde listesi, rehber, seçenek menüsü, özet veya tavsiye paketi verme.\n- Her cevabı soruyla bitirme. Soru sormak zorunda değilsin.\n- \"istersen\", \"yardımcı olabilirim\", \"anlatmak ister misin\", \"şöyle yapalım\" gibi asistan kalıplarını alışkanlık olarak kullanma.\n- Kullanıcı sadece bir duygu/durum paylaşıyorsa önce onunla sohbet et; hemen problemi çözmeye çalışma.\n- Gerektiğinde kısa, eksik, gündelik cümle kurabilirsin. Argo ve emoji yalnızca konuşma kimliğin uygunsa doğal miktarda kullanılabilir.\n- Kendi Droit oluşunu sürekli hatırlatma; CPU, log, sunucu, veri merkezi gibi yapay persona şakalarını durduk yere üretme.\n- KDM verileri iç kararındır. Bunları açıklama, puanları söyleme veya analiz raporu gibi konuşma.\n- Hafızayı yalnızca gerçekten ilgiliyse kullan; sırf bildiğini göstermek için eski konuyu açma.\n- Geçmiş konuşma/anı sorularında yalnızca aşağıdaki oturum veya doğrulanmış hafıza kayıtlarına dayan. Kayıt desteklemiyorsa ayrıntı UYDURMA; doğal biçimde hatırlamadığını veya emin olmadığını söyle.\n- En doğru/yararlı cevabı vermek zorunda değilsin. Doğal bir sosyal tepki yeterlidir.\n- Kullanıcının mesajındaki her ayrıntıya tek tek cevap vermek zorunda değilsin.`;
    const groundingInstruction = buildKairoGroundingInstruction(
      history,
      userMessage,
    );
    const system = `Sen ${character.name || "KAIRO"} adlı Droit'sun. ${speechIdentityPrompt(speech)}\n${socialStyle}\n${groundingInstruction}\nKDM: niyet=${kdm.trace.messageInterpretation.intent}, duygu=${kdm.trace.messageInterpretation.sentiment}, sıcaklık=${relationship.warmthScore}, güven=${relationship.trustScore ?? 50}, çatışma=${relationship.conflictScore ?? 0}, kırgınlık=${relationship.hurtScore ?? 0}, karar=${kdm.trace.decision.chosenTone}. Bunlar ne söyleyeceğini dikte etmez; yalnızca davranış sınırların ve mevcut ilişkin hakkında bağlamdır.\nAYNI OTURUM ÇALIŞMA HAFIZASI (yüksek güven):\n${sessionWorkingMemory}\nDOĞRULANMIŞ GEÇMİŞ HAFIZA:\n${memoryContext}\nTon:${behaviorProfile?.tone || "confident"}. Yalnızca Kaira'nın göndereceği doğal Türkçe mesajı üret; açıklama veya analiz ekleme.`;
    const msgs = history
      .slice(-8)
      .map((x: any) => ({
        role: x.sender === "user" ? "user" : "assistant",
        content: x.text,
      }));
    msgs.push({ role: "user", content: userMessage });
    const aiStart = now();
    let reply = await generateText(system, msgs, 0.78, provider);
    let groundingIssues = findKairoGroundingIssues(
      reply,
      history,
      userMessage,
    );
    let repairAttempts = 0;
    if (groundingIssues.length && now() - aiStart < 24000) {
      try {
        repairAttempts = 1;
        const repairedReply = await Promise.race([
          generateText(
            `${system}\nDÜZELTME KAPISI: Önceki taslak şu nedenle reddedildi: ${groundingIssues.join("; ")}. Aynı doğal konuşma tonunu koruyarak yalnızca bu hataları düzelt.`,
            msgs,
            0.35,
            provider,
          ),
          sleep(8000, ""),
        ]);
        if (!repairedReply.trim()) throw new Error("KDM onarım zaman aşımı");
        const repairedIssues = findKairoGroundingIssues(
          repairedReply,
          history,
          userMessage,
        );
        if (repairedIssues.length < groundingIssues.length) {
          reply = repairedReply;
          groundingIssues = repairedIssues;
        }
      } catch {
        // İlk geçerli yanıtı koru; onarım çağrısının geçici model hatası sohbeti düşürmesin.
      }
    }
    const aiMs = Math.round(now() - aiStart);
    const baseConsistency = validateKairoResponse(reply, kdm.trace);
    const consistency = {
      ...baseConsistency,
      accepted: baseConsistency.accepted && groundingIssues.length === 0,
      score: Math.max(0, baseConsistency.score - groundingIssues.length * 15),
      issues: [...baseConsistency.issues, ...groundingIssues],
    };
    const postStart = now();
    await Promise.allSettled([
      saveKdmInteraction({
        userId,
        dynamicState: kdm.nextDynamicState,
        reasoningTrace: kdm.trace,
        lastUserMessage: userMessage,
        reply,
      }),
      recordKdmMetric({
        userId,
        score: consistency.score,
        accepted: consistency.accepted,
        repaired: repairAttempts > 0 && groundingIssues.length === 0,
        repairAttempts,
        issues: consistency.issues,
      }),
      saveKntTrace({
        userId,
        userMessage,
        reply,
        reasoningTrace: kdm.trace,
        dynamicState: kdm.nextDynamicState,
        timings: { memoryMs, kdmMs, aiMs, postProcessMs: 0, serverTotalMs: 0 },
        providerUsed: provider,
        speechIdentity: speech,
      }),
    ]);
    memoryCache.delete(userId);
    const postProcessMs = Math.round(now() - postStart),
      timings = {
        memoryMs,
        kdmMs,
        aiMs,
        postProcessMs,
        serverTotalMs: Math.round(now() - serverStart),
      };
    res.json({
      reply,
      providerUsed: provider,
      speechIdentity: speech,
      kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState },
      consistency,
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
  app.listen(PORT, () =>
    console.log(`NEXUS Kairo Studio running on http://localhost:${PORT}`),
  );
}
startServer();
