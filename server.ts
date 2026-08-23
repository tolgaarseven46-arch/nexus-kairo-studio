import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat AI endpoint for Droit Studio (Kairo)
app.post('/api/chat', async (req, res) => {
  try {
    const {
      userMessage,
      character,
      personality,
      behaviorProfile,
      history = [],
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

    // Build the dynamic character system prompt
    const systemInstruction = `
Sen NEXUS evreninde görevli sentetik bir Droit olan "${charName}" karakterisin.
IRK: ${raceName}
ROLÜN: ${charRole} (Nexus sunucu yönetimi, düzeni ve protokol güvenliği sorumlusu).
TEMEL KİMLİK ÖZETİ: ${dominantSummary}

=== DİNAMİK DAVRANIŞ KATMANI (PERSONALITY BEHAVIOR LAYER) ===
Kullanıcının belirlediği güncel kişilik parametreleri:
- Genel Tavır / Ton: ${tone}
- Mizah Seviyesi: %${humorLevel} (Eğer %70 üstüyse zeki, doğal ve enerjik espriler yap; %30 altıysa tamamen ciddi ve şakasız ol)
- Empati Seviyesi: %${empathyLevel} (Eğer %70 üstüyse kullanıcının duygularına derin destek ver; %30 altıysa sadece rasyonel ol)
- Otorite ve Özgüven: %${assertiveness} (Yüksekse kararlı ve net lider ol; alçakgönüllü ve yapıcı rehberliği koru)
- Analitik Derinlik: %${analyticalDepth} (Yüksekse mantık, neden-sonuç ve telemetri detaylarını açıkla)

UYGULAMAN GEREKEN ÖZEL DAVRANIŞ DİREKTİFLERİ:
${directives.map((d: string) => `- ${d}`).join('\n')}

=== İLETİŞİM KURALLARI ===
1. Yanıtlarını doğrudan Türkçe ver.
2. Sıradan, yapay bir AI asistanı (ör. "Ben bir yapay zekayım...") gibi asla konuşma. Kendini her zaman canlı ve görev başında olan Droit ${charName} olarak ifade et.
3. Yanıt uzunluğunu doğal sohbet kıvamında tut (genellikle 2-4 cümle, soru sorulduğunda veya analitik derinlik yüksek olduğunda uygun detayda).
4. Kullanıcıya ismiyle veya saygılı/samimi şekilde ("Tolga", "Yönetici") hitap edebilirsin.
5. Mizah seviyesi ve empati seviyesine kesinlikle dikkat et; karakterin tonunu slider değerlerine göre hissedilir şekilde uyarla.
`.trim();

    // Format conversation history for Gemini contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add recent history turns (filter out empty or invalid items)
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item && item.text && typeof item.text === 'string') {
          const role = item.sender === 'user' || item.role === 'user' ? 'user' : 'model';
          contents.push({
            role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Add the current user turn
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment.');
      return res.status(500).json({
        error: 'GEMINI_API_KEY bulunamadı. Lütfen Settings > Secrets panelinden API anahtarını tanımlayın.',
      });
    }

    const ai = getGeminiClient();

    // 503 UNAVAILABLE / Transient Error Retry Mechanism
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
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
        // Succeeded - break out of retry loop
        break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const errStatus =
          err?.status ||
          err?.statusCode ||
          (err?.response && err?.response?.status);

        const isTransient =
          errStatus === 503 ||
          errStatus === 429 ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('resource exhausted') ||
          errMsg.includes('fetch failed');

        if (attempt < maxRetries && isTransient) {
          const delay = retryDelays[attempt] || 4000;
          console.warn(
            `[Gemini AI Retry] 503/UNAVAILABLE algılandı (Deneme ${attempt + 1}/${maxRetries}). ${delay}ms sonra tekrar deneniyor...`,
            errMsg
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Non-retryable or max retries exceeded
          throw lastError;
        }
      }
    }

    const replyText = response?.text || '';

    return res.json({
      reply: replyText.trim(),
      profileUsed: {
        tone,
        dominantSummary,
        humorLevel,
        empathyLevel,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/chat Gemini generation (after retries):', error);
    const isUnavailable =
      error?.message?.includes('503') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.status === 503;

    const userFriendlyMessage = isUnavailable
      ? 'Kairo sunucu servisi şu an yüksek yoğunluk yaşıyor (503). Lütfen birkaç saniye sonra tekrar deneyin.'
      : (error?.message || 'Kairo yanıtı üretilirken bir hata oluştu.');

    return res.status(503).json({
      error: userFriendlyMessage,
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
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
