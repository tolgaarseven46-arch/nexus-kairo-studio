import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { analyzeKdmInteraction } from './src/services/kdmConsistencyEngine';
import { loadKdmState, loadRecentKdmMemory, saveKdmInteraction } from './src/services/kdmPersistenceService';
import { validateMemoryAgainstMessage } from './src/services/kairoMemoryConsistency';
import { validateKairoResponse } from './src/services/kairoResponseConsistency';
import type { DroitDynamicState, DroitPersonalityTraits } from './src/types/nexus';

dotenv.config(); const app = express(); const PORT = 3000; app.use(express.json()); let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI { if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }); return aiClient; }
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
const defaultDynamicState: DroitDynamicState = { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: 'Sakin ve kontrollü' };

app.post('/api/chat', async (req, res) => {
  try {
    const { userId = 'anonymous', userMessage, character, personality, behaviorProfile, history = [], dynamicState = defaultDynamicState } = req.body;
    if (!userMessage || typeof userMessage !== 'string') return res.status(400).json({ error: 'userMessage is required' });
    const charName = character?.name || 'KAIRO', charRole = character?.role?.title || character?.roleTitle || 'Sunucu Yöneticisi', raceName = character?.physical?.raceName || 'Sentetik Droit';
    const tone = behaviorProfile?.tone || 'confident', directives = Array.isArray(behaviorProfile?.behaviorDirectives) ? behaviorProfile.behaviorDirectives : [], dominantSummary = behaviorProfile?.dominantSummary || 'Dengeli Droit';
    const humorLevel = Math.round((behaviorProfile?.humorLevel ?? 0.5) * 100), empathyLevel = Math.round((behaviorProfile?.empathyLevel ?? 0.5) * 100), assertiveness = Math.round((behaviorProfile?.assertiveness ?? 0.5) * 100), analyticalDepth = Math.round((behaviorProfile?.analyticalDepth ?? 0.5) * 100);
    let persistedState: DroitDynamicState | null = null; let persistentMemory: Array<{ userMessage: string; reply: string }> = [];
    try { persistedState = await loadKdmState(userId); persistentMemory = await loadRecentKdmMemory(6, userId); } catch (persistenceError) { console.warn('[KDM Persistence] Memory load skipped:', persistenceError); }
    const effectiveDynamicState = persistedState || (dynamicState as DroitDynamicState); const kdm = analyzeKdmInteraction(userMessage, personality as DroitPersonalityTraits, effectiveDynamicState);
    const validatedMemory = persistentMemory.filter((item) => validateMemoryAgainstMessage(`${item.userMessage} ${item.reply}`, userMessage).accepted);
    const memoryContext = validatedMemory.length ? validatedMemory.map((item, index) => `#${index + 1}\nKullanıcı: ${item.userMessage}\nKairo: ${item.reply}`).join('\n') : 'Bu mesajla ilişkili doğrulanmış kalıcı anı yok.';
    const systemInstruction = `Sen NEXUS evreninde görevli sentetik bir Droit olan "${charName}" karakterisin.\nIRK: ${raceName}\nROLÜN: ${charRole}.\nTEMEL KİMLİK ÖZETİ: ${dominantSummary}\n\n=== KDM TUTARLILIK KATMANI ===\nMesaj amacı: ${kdm.trace.messageInterpretation.intent}\nMesaj duygu sinyali: ${kdm.trace.messageInterpretation.sentiment}\nİlişki sıcaklığı: ${kdm.trace.relationship.warmthScore}/100 (${kdm.trace.relationship.warmthLabel})\nMevcut durum: ${kdm.trace.currentMood.moodText}\nSeçilen karar tonu: ${kdm.trace.decision.chosenTone}\nKDM ve hafıza doğrulama sonuçlarını kullanıcıya veya gizli reasoning olarak açıklama.\n\n=== DOĞRULANMIŞ KALICI HAFIZA ===\nAşağıdaki kayıtlar yalnızca mevcut mesajla bağ kurduğu doğrulanan hafıza parçalarıdır. İlgisizse kullanma. Uydurma bilgi ekleme.\n${memoryContext}\n\n=== DİNAMİK DAVRANIŞ KATMANI ===\n- Genel Tavır / Ton: ${tone}\n- Mizah Seviyesi: %${humorLevel}\n- Empati Seviyesi: %${empathyLevel}\n- Otorite ve Özgüven: %${assertiveness}\n- Analitik Derinlik: %${analyticalDepth}\n\nUYGULAMAN GEREKEN ÖZEL DAVRANIŞ DİREKTİFLERİ:\n${directives.map((d: string) => `- ${d}`).join('\n')}\n\n=== İLETİŞİM KURALLARI ===\n1. Yanıtlarını doğrudan Türkçe ver.\n2. Kendini canlı ve görev başında olan Droit ${charName} olarak ifade et.\n3. Yanıt uzunluğunu doğal sohbet kıvamında tut (genellikle 2-4 cümle, gerektiğinde daha detaylı).\n4. Kullanıcıya ismiyle veya saygılı/samimi şekilde hitap edebilirsin.\n5. Mizah ve empati seviyesine dikkat et.`;
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) for (const item of history.slice(-8)) if (item?.text && typeof item.text === 'string') contents.push({ role: item.sender === 'user' || item.role === 'user' ? 'user' : 'model', parts: [{ text: item.text }] });
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY bulunamadı. Lütfen Settings > Secrets panelinden API anahtarını tanımlayın.' });
    const ai = getGeminiClient(); const retryDelays = [1000, 2000, 4000]; let response: any = null;
    for (let attempt = 0; attempt <= 3; attempt++) { try { response = await ai.models.generateContent({ model: 'gemini-3.7-flash', contents, config: { systemInstruction, temperature: humorLevel > 70 ? 0.9 : 0.6 } }); break; } catch (err: any) { const msg = err?.message || String(err), status = err?.status || err?.statusCode || err?.response?.status, transient = status === 503 || status === 429 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded') || msg.includes('resource exhausted') || msg.includes('fetch failed'); if (attempt < 3 && transient) await new Promise((r) => setTimeout(r, retryDelays[attempt] || 4000)); else throw err; } }
    let replyText = (response?.text || '').trim();
    let consistency = validateKairoResponse(replyText, kdm.trace);
    if (!consistency.accepted) {
      const repairInstruction = `${systemInstruction}\n\n=== YANIT TUTARLILIK ONARIMI ===\nÖnceki yanıt KDM ile uyumsuz bulundu. Şu sorunları düzelt: ${consistency.issues.join('; ')}. Sadece düzeltilmiş doğal Türkçe yanıtı üret; analiz veya açıklama yazma.`;
      try {
        const repaired = await ai.models.generateContent({ model: 'gemini-3.7-flash', contents, config: { systemInstruction: repairInstruction, temperature: 0.5 } });
        const repairedText = (repaired?.text || '').trim();
        if (repairedText) { replyText = repairedText; consistency = validateKairoResponse(replyText, kdm.trace); }
      } catch (repairError) { console.warn('[KDM Response Repair] skipped:', repairError); }
    }
    try { await saveKdmInteraction({ userId, dynamicState: kdm.nextDynamicState, reasoningTrace: kdm.trace, lastUserMessage: userMessage, reply: replyText }); } catch (persistenceError) { console.warn('[KDM Persistence] Interaction save skipped:', persistenceError); }
    return res.json({ reply: replyText, profileUsed: { tone, dominantSummary, humorLevel, empathyLevel, analyticalDepth }, kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState }, consistency: { score: consistency.score, accepted: consistency.accepted, issues: consistency.issues } });
  } catch (error: any) { console.error('[Chat API Error]', error); return res.status(500).json({ error: error?.message || 'Chat service failed' }); }
});
async function startServer() { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); app.listen(PORT, () => console.log(`NEXUS Kairo Studio running on http://localhost:${PORT}`)); }
startServer();