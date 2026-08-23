import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { analyzeKdmInteraction } from './src/services/kdmConsistencyEngine';
import { loadKdmState, saveKdmInteraction } from './src/services/kdmPersistenceService';
import type { DroitDynamicState, DroitPersonalityTraits } from './src/types/nexus';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const defaultDynamicState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin ve kontrollü',
};

app.post('/api/chat', async (req, res) => {
  try {
    const {
      userMessage,
      character,
      personality,
      behaviorProfile,
      history = [],
      dynamicState = defaultDynamicState,
    } = req.body;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    const charName = character?.name || 'KAIRO';
    const charRole = character?.role?.title || character?.roleTitle || 'Sunucu Yöneticisi';
    const raceName = character?.physical?.raceName || 'Sentetik Droit';
    const tone = behaviorProfile?.tone || 'confident';
    const directives = Array.isArray(behaviorProfile?.behaviorDirectives)
      ? behaviorProfile.behaviorDirectives
      : [];
    const dominantSummary = behaviorProfile?.dominantSummary || 'Dengeli Droit';
    const humorLevel = Math.round((behaviorProfile?.humorLevel ?? 0.5) * 100);
    const empathyLevel = Math.round((behaviorProfile?.empathyLevel ?? 0.5) * 100);
    const assertiveness = Math.round((behaviorProfile?.assertiveness ?? 0.5) * 100);
    const analyticalDepth = Math.round((behaviorProfile?.analyticalDepth ?? 0.5) * 100);

    let persistedState: DroitDynamicState | null = null;
    try {
      persistedState = await loadKdmState();
    } catch (persistenceError) {
      console.warn('[KDM Persistence] State load skipped:', persistenceError);
    }

    const effectiveDynamicState = persistedState || (dynamicState as DroitDynamicState);

    const kdm = analyzeKdmInteraction(
      userMessage,
      personality as DroitPersonalityTraits,
      effectiveDynamicState
    );

    const systemInstruction = `
Sen NEXUS evreninde görevli sentetik bir Droit olan "${charName}" karakterisin.
IRK: ${raceName}
ROLÜN: ${charRole} (Nexus sunucu yönetimi, düzeni ve protokol güvenliği sorumlusu).
TEMEL KİMLİK ÖZETİ: ${dominantSummary}

=== KDM TUTARLILIK KATMANI ===
Mesaj amacı: ${kdm.trace.messageInterpretation.intent}
Mesaj duygu sinyali: ${kdm.trace.messageInterpretation.sentiment}
İlişki sıcaklığı: ${kdm.trace.relationship.warmthScore}/100 (${kdm.trace.relationship.warmthLabel})
Mevcut durum: ${kdm.trace.currentMood.moodText}
Seçilen karar tonu: ${kdm.trace.decision.chosenTone}

Bu analiz davranış kararını destekler; kullanıcıya iç sistem analizini veya gizli reasoning bilgisini açıklama.
Yanıtın seçilen davranış tonuyla tutarlı olsun ve aynı konuşma bağlamında gereksiz kişilik değişimleri yapma.

=== DİNAMİK DAVRANIŞ KATMANI ===
- Genel Tavır / Ton: ${tone}
- Mizah Seviyesi: %${humorLevel}
- Empati Seviyesi: %${empathyLevel}
- Otorite ve Özgüven: %${assertiveness}
- Analitik Derinlik: %${analyticalDepth}

UYGULAMAN GEREKEN ÖZEL DAVRANIŞ DİREKTİFLERİ:
${directives.map((d: string) => `- ${d}`).join('\n')}

=== İLETİŞİM KURALLARI ===
1. Yanıtlarını doğrudan Türkçe ver.
2. Sıradan, yapay bir AI asistanı gibi konuşma. Kendini her zaman canlı ve görev başında olan Droit ${charName} olarak ifade et.
3. Yanıt uzunluğunu doğal sohbet kıvamında tut (genellikle 2-4 cümle, gerektiğinde daha detaylı).
4. Kullanıcıya ismiyle veya saygılı/samimi şekilde hitap edebilirsin.
5. Mizah ve empati seviyesine dikkat et.
`.trim();

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item && item.text && typeof item.text === 'string') {
          const role = item.sender === 'user' || item.role === 'user' ? 'user' : 'model';
          contents.push({ role, parts: [{ text: item.text }] });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY bulunamadı. Lütfen Settings > Secrets panelinden API anahtarını tanımlayın.',
      });
    }

    const ai = getGeminiClient();
    const retryDelays = [1000, 2000, 4000];
    const maxRetries = 3;
    let response: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents,
          config: {
            systemInstruction,
            temperature: humorLevel > 70 ? 0.9 : 0.6,
          },
        });
        break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const errStatus = err?.status || err?.statusCode || err?.response?.status;
        const isTransient =
          errStatus === 503 || errStatus === 429 || errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') || errMsg.includes('overloaded') ||
          errMsg.includes('resource exhausted') || errMsg.includes('fetch failed');

        if (attempt < maxRetries && isTransient) {
          const delay = retryDelays[attempt] || 4000;
          console.warn(`[Gemini AI Retry] Deneme ${attempt + 1}/${maxRetries}. ${delay}ms sonra tekrar deneniyor...`, errMsg);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw lastError;
        }
      }
    }

    const replyText = (response?.text || '').trim();

    try {
      await saveKdmInteraction({
        dynamicState: kdm.nextDynamicState,
        reasoningTrace: kdm.trace,
        lastUserMessage: userMessage,
        reply: replyText,
      });
    } catch (persistenceError) {
      console.warn('[KDM Persistence] Interaction save skipped:', persistenceError);
    }

    return res.json({
      reply: replyText,
      profileUsed: {
        tone,
        dominantSummary,
        humorLevel,
        empathyLevel,
      },
      kdm: {
        trace: kdm.trace,
        dynamicState: kdm.nextDynamicState,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/chat Gemini generation (after retries):', error);
    const isUnavailable = error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.status === 503;
    const userFriendlyMessage = isUnavailable
      ? 'Kairo sunucu servisi şu an yüksek yoğunluk yaşıyor (503). Lütfen birkaç saniye sonra tekrar deneyin.'
      : (error?.message || 'Kairo yanıtı üretilirken bir hata oluştu.');

    return res.status(503).json({ error: userFriendlyMessage });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
