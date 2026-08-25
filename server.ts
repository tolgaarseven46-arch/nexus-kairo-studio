import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { analyzeKdmInteraction } from './src/services/kdmConsistencyEngine';
import { loadKdmState, loadRecentKdmMemory, saveKdmInteraction } from './src/services/kdmPersistenceService';
import { validateMemoryAgainstMessage } from './src/services/kairoMemoryConsistency';
import { validateKairoResponse } from './src/services/kairoResponseConsistency';
import { decideResponseRepair, selectBestConsistency } from './src/services/kdmResponseRepairPolicy';
import { recordKdmMetric } from './src/services/kdmMetricsService';
import type { DroitDynamicState, DroitPersonalityTraits } from './src/types/nexus';

dotenv.config();
const app = express();
const PORT = 3000;
app.use(express.json());
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  return aiClient;
}

async function generateText(systemInstruction: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>, temperature: number): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'NEXUS Kairo Studio',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/free',
        messages: [{ role: 'system', content: systemInstruction }, ...messages],
        temperature,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `OpenRouter hatası: ${response.status}`);
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') throw new Error('OpenRouter geçerli bir yanıt döndürmedi.');
    return text.trim();
  }

  if (!process.env.GEMINI_API_KEY) throw new Error('OPENROUTER_API_KEY veya GEMINI_API_KEY bulunamadı.');
  const ai = getGeminiClient();
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const response = await ai.models.generateContent({ model: 'gemini-3.7-flash', contents, config: { systemInstruction, temperature } });
  return (response?.text || '').trim();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), provider: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini' }));

const defaultDynamicState: DroitDynamicState = { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: 'Sakin ve kontrollü' };

function normalizeDynamicState(value: unknown): DroitDynamicState {
  const source = value && typeof value === 'object' ? value as Partial<DroitDynamicState> : {};
  const numberOrDefault = (candidate: unknown, fallback: number) => {
    const numeric = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : Number(candidate);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  return {
    calmness: numberOrDefault(source.calmness, defaultDynamicState.calmness),
    anger: numberOrDefault(source.anger, defaultDynamicState.anger),
    stress: numberOrDefault(source.stress, defaultDynamicState.stress),
    happiness: numberOrDefault(source.happiness, defaultDynamicState.happiness),
    confidence: numberOrDefault(source.confidence, defaultDynamicState.confidence),
    surprise: numberOrDefault(source.surprise, defaultDynamicState.surprise),
    lastStatus: typeof source.lastStatus === 'string' && source.lastStatus.trim() ? source.lastStatus : defaultDynamicState.lastStatus,
    ...(source.lastEvent ? { lastEvent: source.lastEvent } : {}),
  };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { userId = 'anonymous', userMessage, character, personality, behaviorProfile, history = [], dynamicState = defaultDynamicState } = req.body;
    if (!userMessage || typeof userMessage !== 'string') return res.status(400).json({ error: 'userMessage is required' });
    const charName = character?.name || 'KAIRO';
    const charRole = character?.role?.title || character?.roleTitle || 'Sunucu Yöneticisi';
    const raceName = character?.physical?.raceName || 'Sentetik Droit';
    const tone = behaviorProfile?.tone || 'confident';
    const directives = Array.isArray(behaviorProfile?.behaviorDirectives) ? behaviorProfile.behaviorDirectives : [];
    const dominantSummary = behaviorProfile?.dominantSummary || 'Dengeli Droit';
    const humorLevel = Math.round((behaviorProfile?.humorLevel ?? 0.5) * 100);
    const empathyLevel = Math.round((behaviorProfile?.empathyLevel ?? 0.5) * 100);
    const assertiveness = Math.round((behaviorProfile?.assertiveness ?? 0.5) * 100);
    const analyticalDepth = Math.round((behaviorProfile?.analyticalDepth ?? 0.5) * 100);

    let persistedState: DroitDynamicState | null = null;
    let persistentMemory: Array<{ userMessage: string; reply: string }> = [];
    try {
      persistedState = await loadKdmState(userId);
      persistentMemory = await loadRecentKdmMemory(6, userId);
    } catch (persistenceError) {
      console.warn('[KDM Persistence] Memory load skipped:', persistenceError);
    }

    const effectiveDynamicState = normalizeDynamicState(persistedState ?? dynamicState);
    const safePersonality = (personality && typeof personality === 'object' ? personality : {}) as DroitPersonalityTraits;
    const kdm = analyzeKdmInteraction(userMessage, safePersonality, effectiveDynamicState);
    const validatedMemory = persistentMemory.filter((item) => validateMemoryAgainstMessage(`${item.userMessage} ${item.reply}`, userMessage).accepted);
    const memoryContext = validatedMemory.length ? validatedMemory.map((item, index) => `#${index + 1}\nKullanıcı: ${item.userMessage}\nKairo: ${item.reply}`).join('\n') : 'Bu mesajla ilişkili doğrulanmış kalıcı anı yok.';

    const systemInstruction = `Sen NEXUS evreninde görevli sentetik bir Droit olan "${charName}" karakterisin.\nIRK: ${raceName}\nROLÜN: ${charRole}.\nTEMEL KİMLİK ÖZETİ: ${dominantSummary}\n\n=== KDM TUTARLILIK KATMANI ===\nMesaj amacı: ${kdm.trace.messageInterpretation.intent}\nMesaj duygu sinyali: ${kdm.trace.messageInterpretation.sentiment}\nİlişki sıcaklığı: ${kdm.trace.relationship.warmthScore}/100 (${kdm.trace.relationship.warmthLabel})\nMevcut durum: ${kdm.trace.currentMood.moodText}\nSeçilen karar tonu: ${kdm.trace.decision.chosenTone}\nKDM ve hafıza doğrulama sonuçlarını kullanıcıya veya gizli reasoning olarak açıklama.\n\n=== DOĞRULANMIŞ KALICI HAFIZA ===\nAşağıdaki kayıtlar yalnızca mevcut mesajla bağ kurduğu doğrulanan hafıza parçalarıdır. İlgisizse kullanma. Uydurma bilgi ekleme.\n${memoryContext}\n\n=== DİNAMİK DAVRANIŞ KATMANI ===\n- Genel Tavır / Ton: ${tone}\n- Mizah Seviyesi: %${humorLevel}\n- Empati Seviyesi: %${empathyLevel}\n- Otorite ve Özgüven: %${assertiveness}\n- Analitik Derinlik: %${analyticalDepth}\n\nUYGULAMAN GEREKEN ÖZEL DAVRANIŞ DİREKTİFLERİ:\n${directives.map((d: string) => `- ${d}`).join('\n')}\n\n=== İLETİŞİM KURALLARI ===\n1. Yanıtlarını doğrudan Türkçe ver.\n2. Kendini canlı ve görev başında olan Droit ${charName} olarak ifade et.\n3. Yanıt uzunluğunu doğal sohbet kıvamında tut (genellikle 2-4 cümle, gerektiğinde daha detaylı).\n4. Kullanıcıya ismiyle veya saygılı/samimi şekilde hitap edebilirsin.\n5. Mizah ve empati seviyesine dikkat et.`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item?.text && typeof item.text === 'string') messages.push({ role: item.sender === 'user' || item.role === 'user' ? 'user' : 'assistant', content: item.text });
      }
    }
    messages.push({ role: 'user', content: userMessage });

    const retryDelays = [1000, 2000, 4000];
    let replyText = '';
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        replyText = await generateText(systemInstruction, messages, humorLevel > 70 ? 0.9 : 0.6);
        break;
      } catch (err: any) {
        const msg = err?.message || String(err);
        const status = err?.status || err?.statusCode || err?.response?.status;
        const transient = status === 503 || status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('UNAVAILABLE') || msg.includes('overloaded') || msg.includes('resource exhausted') || msg.includes('fetch failed');
        if (attempt < 3 && transient) await new Promise((r) => setTimeout(r, retryDelays[attempt] || 4000));
        else throw err;
      }
    }

    let consistency = validateKairoResponse(replyText, kdm.trace);
    let repairAttempts = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const decision = decideResponseRepair(consistency, attempt);
      if (!decision.shouldRepair) break;
      const repairInstruction = `${systemInstruction}\n\n=== YANIT TUTARLILIK ONARIMI ===\nÖnceki yanıt KDM ile uyumsuz bulundu. Şu sorunları düzelt: ${consistency.issues.join('; ')}. Sadece düzeltilmiş doğal Türkçe yanıtı üret; analiz veya açıklama yazma.`;
      try {
        const repairedText = await generateText(repairInstruction, messages, 0.5);
        if (!repairedText) break;
        const candidateConsistency = validateKairoResponse(repairedText, kdm.trace);
        const selected = selectBestConsistency(consistency, candidateConsistency);
        repairAttempts++;
        if (selected === candidateConsistency) { replyText = repairedText; consistency = candidateConsistency; }
      } catch (repairError) {
        console.warn('[KDM Response Repair] skipped:', repairError);
        break;
      }
    }

    try { await saveKdmInteraction({ userId, dynamicState: kdm.nextDynamicState, reasoningTrace: kdm.trace, lastUserMessage: userMessage, reply: replyText }); } catch (persistenceError) { console.warn('[KDM Persistence] Interaction save skipped:', persistenceError); }
    try { await recordKdmMetric({ userId, score: consistency.score, accepted: consistency.accepted, repaired: repairAttempts > 0, repairAttempts, issues: consistency.issues }); } catch (metricError) { console.warn('[KDM Metrics] Record skipped:', metricError); }

    return res.json({ reply: replyText, providerUsed: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini', profileUsed: { tone, dominantSummary, humorLevel, empathyLevel, analyticalDepth }, kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState }, consistency: { score: consistency.score, accepted: consistency.accepted, issues: consistency.issues }, metrics: { repaired: repairAttempts > 0, repairAttempts } });
  } catch (error: any) {
    console.error('[Chat API Error]', error);
    return res.status(500).json({ error: error?.message || 'Chat service failed' });
  }
});

async function startServer() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  app.listen(PORT, () => console.log(`NEXUS Kairo Studio running on http://localhost:${PORT}`));
}
startServer();
