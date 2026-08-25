import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { analyzeKdmInteraction } from './src/services/kdmConsistencyEngine';
import { loadKdmState, loadRecentKdmMemory, saveKdmInteraction } from './src/services/kdmPersistenceService';
import { validateMemoryAgainstMessage } from './src/services/kairoMemoryConsistency';
import { validateKairoResponse } from './src/services/kairoResponseConsistency';
import { recordKdmMetric } from './src/services/kdmMetricsService';
import type { DroitDynamicState, DroitPersonalityTraits } from './src/types/nexus';

dotenv.config();
const app = express();
const PORT = 3000;
app.use(express.json());
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI { if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }); return aiClient; }

function extractOpenRouterText(data: any): string {
  const message = data?.choices?.[0]?.message;
  const direct = message?.content;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (Array.isArray(direct)) {
    const joined = direct.map((part: any) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    }).filter(Boolean).join('\n').trim();
    if (joined) return joined;
  }
  if (typeof message?.text === 'string' && message.text.trim()) return message.text.trim();
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  return '';
}

async function callOpenRouter(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, temperature: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY bulunamadı.');
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        ...(process.env.APP_URL ? { 'HTTP-Referer': process.env.APP_URL } : {}),
        'X-Title': 'NEXUS Kairo Studio',
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: 500 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `OpenRouter hatası: HTTP ${response.status}`);
    const text = extractOpenRouterText(data);
    if (!text) {
      const finishReason = data?.choices?.[0]?.finish_reason || 'unknown';
      throw new Error(`OpenRouter boş yanıt döndürdü (finish_reason: ${finishReason}).`);
    }
    return text;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('OpenRouter isteği zaman aşımına uğradı.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateText(systemInstruction: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>, temperature: number, provider: 'gemini' | 'openrouter' = 'openrouter'): Promise<string> {
  if (provider === 'openrouter') return callOpenRouter([{ role: 'system', content: systemInstruction }, ...messages], temperature);
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY bulunamadı.');
  const ai = getGeminiClient();
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const response = await ai.models.generateContent({ model: 'gemini-3.6-flash', contents, config: { systemInstruction } });
  return (response?.text || '').trim();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), geminiConfigured: Boolean(process.env.GEMINI_API_KEY), openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY), openrouterModel: process.env.OPENROUTER_MODEL || 'openrouter/free' }));
app.post('/api/openrouter/test', async (_req, res) => { try { const reply = await callOpenRouter([{ role: 'user', content: 'Bağlantı testi. Sadece "OPENROUTER_OK" yaz.' }], 0); return res.json({ ok: true, provider: 'openrouter', model: process.env.OPENROUTER_MODEL || 'openrouter/free', reply }); } catch (error: any) { console.error('[OpenRouter Test]', error); return res.status(502).json({ ok: false, provider: 'openrouter', configured: Boolean(process.env.OPENROUTER_API_KEY), model: process.env.OPENROUTER_MODEL || 'openrouter/free', error: error?.message || 'OpenRouter test failed' }); } });
const defaultDynamicState: DroitDynamicState = { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: 'Sakin ve kontrollü' };
function normalizeDynamicState(value: unknown): DroitDynamicState { const source = value && typeof value === 'object' ? value as Partial<DroitDynamicState> : {}; const numberOrDefault = (candidate: unknown, fallback: number) => { const numeric = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : Number(candidate); return Number.isFinite(numeric) ? numeric : fallback; }; return { calmness: numberOrDefault(source.calmness, defaultDynamicState.calmness), anger: numberOrDefault(source.anger, defaultDynamicState.anger), stress: numberOrDefault(source.stress, defaultDynamicState.stress), happiness: numberOrDefault(source.happiness, defaultDynamicState.happiness), confidence: numberOrDefault(source.confidence, defaultDynamicState.confidence), surprise: numberOrDefault(source.surprise, defaultDynamicState.surprise), lastStatus: typeof source.lastStatus === 'string' && source.lastStatus.trim() ? source.lastStatus : defaultDynamicState.lastStatus, ...(source.lastEvent ? { lastEvent: source.lastEvent } : {}), ...(source.relationship ? { relationship: source.relationship } : {}) }; }

app.post('/api/chat', async (req, res) => {
  try {
    const { userId = 'anonymous', userMessage, character, personality, behaviorProfile, history = [], dynamicState = defaultDynamicState, provider = 'openrouter' } = req.body; if (!userMessage || typeof userMessage !== 'string') return res.status(400).json({ error: 'userMessage is required' }); const selectedProvider: 'gemini' | 'openrouter' = provider === 'gemini' ? 'gemini' : 'openrouter';
    const charName = character?.role?.name || character?.name || 'KAIRO'; const charRole = character?.role?.title || character?.roleTitle || 'Sunucu Yöneticisi'; const raceName = character?.physical?.raceName || 'Sentetik Droit'; const tone = behaviorProfile?.tone || 'confident'; const directives = Array.isArray(behaviorProfile?.behaviorDirectives) ? behaviorProfile.behaviorDirectives : []; const dominantSummary = behaviorProfile?.dominantSummary || 'Dengeli Droit'; const humorLevel = Math.round((behaviorProfile?.humorLevel ?? 0.5) * 100); const empathyLevel = Math.round((behaviorProfile?.empathyLevel ?? 0.5) * 100); const assertiveness = Math.round((behaviorProfile?.assertiveness ?? 0.5) * 100); const analyticalDepth = Math.round((behaviorProfile?.analyticalDepth ?? 0.5) * 100);
    let persistedState: DroitDynamicState | null = null; let persistentMemory: Array<{ userMessage: string; reply: string }> = []; try { persistedState = await loadKdmState(userId); persistentMemory = await loadRecentKdmMemory(6, userId); } catch (e) { console.warn('[KDM Persistence] Memory load skipped:', e); }
    const effectiveDynamicState = normalizeDynamicState(persistedState ?? dynamicState); const safePersonality = (personality && typeof personality === 'object' ? personality : {}) as DroitPersonalityTraits; const kdm = analyzeKdmInteraction(userMessage, safePersonality, effectiveDynamicState); const validatedMemory = persistentMemory.filter((item) => validateMemoryAgainstMessage(`${item.userMessage} ${item.reply}`, userMessage).accepted); const memoryContext = validatedMemory.length ? validatedMemory.map((item, index) => `#${index + 1}\nKullanıcı: ${item.userMessage}\nKairo: ${item.reply}`).join('\n') : 'Bu mesajla ilişkili doğrulanmış kalıcı anı yok.';
    const relationship = kdm.trace.relationship;
    const systemInstruction = `Sen NEXUS evreninde görevli sentetik bir Droit olan "${charName}" karakterisin.\nIRK: ${raceName}\nROLÜN: ${charRole}.\nTEMEL KİMLİK ÖZETİ: ${dominantSummary}\n\n=== KDM TUTARLILIK KATMANI ===\nMesaj amacı: ${kdm.trace.messageInterpretation.intent}\nMesaj duygu sinyali: ${kdm.trace.messageInterpretation.sentiment}\nİlişki sıcaklığı: ${relationship.warmthScore}/100 (${relationship.warmthLabel})\nTanışıklık süresi: ${relationship.familiarityDays ?? 0} gün\nGeçmiş etkileşim sayısı: ${relationship.interactionCount ?? 0}\nTepki hassasiyeti: %${Math.round((relationship.toleranceMultiplier ?? 1) * 100)}\nMevcut durum: ${kdm.trace.currentMood.moodText}\nSeçilen karar tonu: ${kdm.trace.decision.chosenTone}\nKDM ve hafıza doğrulama sonuçlarını kullanıcıya veya gizli reasoning olarak açıklama.\nTanışıklık arttıkça, özellikle ilişki sıcaksa, küçük hatalara ve sert sözlere ilk güne göre daha az tepki ver; bu durum temel kişiliği değiştirmez, yalnızca tepkinin şiddetini değiştirir.\n\n=== DOĞRULANMIŞ KALICI HAFIZA ===\n${memoryContext}\n\n=== DİNAMİK DAVRANIŞ KATMANI ===\n- Genel Tavır / Ton: ${tone}\n- Mizah Seviyesi: %${humorLevel}\n- Empati Seviyesi: %${empathyLevel}\n- Otorite ve Özgüven: %${assertiveness}\n- Analitik Derinlik: %${analyticalDepth}\n\nUYGULAMAN GEREKEN ÖZEL DAVRANIŞ DİREKTİFLERİ:\n${directives.map((d: string) => `- ${d}`).join('\n')}\n\n=== İLETİŞİM KURALLARI ===\n1. Yanıtlarını doğrudan Türkçe ver.\n2. Kendini canlı ve görev başında olan Droit ${charName} olarak ifade et.\n3. Yanıt uzunluğunu doğal sohbet kıvamında tut (genellikle 2-4 cümle, gerektiğinde daha detaylı).\n4. Kullanıcıya ismiyle veya saygılı/samimi şekilde hitap edebilirsin.\n5. Mizah ve empati seviyesine dikkat et.`;
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []; if (Array.isArray(history)) for (const item of history.slice(-8)) if (item?.text && typeof item.text === 'string') messages.push({ role: item.sender === 'user' || item.role === 'user' ? 'user' : 'assistant', content: item.text }); messages.push({ role: 'user', content: userMessage });
    const replyText = await generateText(systemInstruction, messages, humorLevel > 70 ? 0.9 : 0.6, selectedProvider); const consistency = validateKairoResponse(replyText, kdm.trace); const repairAttempts = 0; try { await saveKdmInteraction({ userId, dynamicState: kdm.nextDynamicState, reasoningTrace: kdm.trace, lastUserMessage: userMessage, reply: replyText }); } catch (e) { console.warn('[KDM Persistence] Interaction save skipped:', e); } try { await recordKdmMetric({ userId, score: consistency.score, accepted: consistency.accepted, repaired: false, repairAttempts, issues: consistency.issues }); } catch (e) { console.warn('[KDM Metrics] Record skipped:', e); }
    return res.json({ reply: replyText, providerUsed: selectedProvider, profileUsed: { tone, dominantSummary, humorLevel, empathyLevel, analyticalDepth }, kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState }, consistency: { score: consistency.score, accepted: consistency.accepted, issues: consistency.issues }, metrics: { repaired: false, repairAttempts } });
  } catch (error: any) { console.error('[Chat API Error]', error); return res.status(500).json({ error: error?.message || 'Chat service failed' }); }
});
async function startServer() { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); app.listen(PORT, () => console.log(`NEXUS Kairo Studio running on http://localhost:${PORT}`)); }
startServer();