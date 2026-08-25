import {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from '../types/nexus';
import { computeBehaviorProfile, BehaviorLayerProfile } from './droitBehaviorEngine';

export interface KdmAnalysisResult {
  trace: ReasoningTrace;
  behaviorProfile: BehaviorLayerProfile;
  nextDynamicState: DroitDynamicState;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

function classifyIntent(message: string): string {
  const text = message.toLowerCase();
  if (/^(selam|merhaba|hey|naber|nasılsın)\b/.test(text)) return 'selamlama';
  if (/(neden|nasıl|ne demek|açıkla|anlat|nedir|niye)/.test(text)) return 'bilgi_ve_aciklama';
  if (/(hata|sorun|çöktü|çalışmıyor|bug|arıza|bozuk)/.test(text)) return 'sorun_cozme';
  if (/(yap|oluştur|ekle|değiştir|geliştir|uygula)/.test(text)) return 'eylem_talebi';
  if (/[?]/.test(text)) return 'soru';
  return 'genel_sohbet';
}

function classifySentiment(message: string): string {
  const text = message.toLowerCase();
  if (/(teşekkür|sağ ol|harika|süper|mükemmel|seviyorum|güzel)/.test(text)) return 'pozitif';
  if (/(sinir|kızgın|nefret|rezalet|bok|amk|lanet|berbat)/.test(text)) return 'negatif';
  if (/(üzgün|kötü|moralim|kaygı|endişe|stres)/.test(text)) return 'duygusal_yük';
  return 'nötr';
}

function warmthDeltaFor(message: string, sentiment: string): number {
  const text = message.toLowerCase();
  let delta = sentiment === 'pozitif' ? 3 : sentiment === 'negatif' ? -2 : 0;
  if (/(teşekkür|sağ ol|eyvallah|kanka|kardeşim|dostum)/.test(text)) delta += 2;
  if (/(siktir|defol|sus|aptal|salak)/.test(text)) delta -= 5;
  return clamp(delta, -10, 10);
}

function moodChangeFromDelta(delta: number): string {
  if (delta >= 4) return 'daha pozitif ve sıcak';
  if (delta <= -4) return 'daha temkinli ve mesafeli';
  return 'stabil';
}

const DEFAULT_DYNAMIC_STATE: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin ve kontrollü',
};

export function analyzeKdmInteraction(
  userMessage: string,
  personality?: DroitPersonalityTraits | null,
  currentDynamicState?: DroitDynamicState | null
): KdmAnalysisResult {
  const state: DroitDynamicState = {
    ...DEFAULT_DYNAMIC_STATE,
    ...(currentDynamicState || {}),
  };
  const behaviorProfile = computeBehaviorProfile(personality || undefined, userMessage);
  const intent = classifyIntent(userMessage);
  const sentiment = classifySentiment(userMessage);
  const conf = typeof state.confidence === 'number' ? state.confidence : 70;
  const happ = typeof state.happiness === 'number' ? state.happiness : 70;
  const warmthBefore = clamp((conf + happ) / 2);
  const warmthDelta = warmthDeltaFor(userMessage, sentiment);
  const warmthAfter = clamp(warmthBefore + warmthDelta);

  const stressDelta = sentiment === 'negatif' ? 3 : sentiment === 'duygusal_yük' ? 2 : -1;
  const happinessDelta = sentiment === 'pozitif' ? 4 : sentiment === 'negatif' ? -2 : 1;
  const confidenceDelta = intent === 'eylem_talebi' ? 1 : 0;

  const nextDynamicState: DroitDynamicState = {
    ...state,
    stress: clamp((state.stress ?? 20) + stressDelta),
    happiness: clamp((state.happiness ?? 70) + happinessDelta),
    confidence: clamp((state.confidence ?? 70) + confidenceDelta),
    calmness: clamp((state.calmness ?? 70) + (sentiment === 'negatif' ? -2 : 1)),
    lastStatus: moodChangeFromDelta(warmthDelta),
    lastEvent: {
      eventTitle: `KDM: ${intent}`,
      reactionText: `Mesaj ${sentiment} olarak sınıflandırıldı; ${behaviorProfile.tone} ton seçildi.`,
      deltas: [
        { label: 'Stres', key: 'stress', value: stressDelta },
        { label: 'Mutluluk', key: 'happiness', value: happinessDelta },
        { label: 'Sakinlik', key: 'calmness', value: sentiment === 'negatif' ? -2 : 1 },
      ],
    },
  };

  const trace: ReasoningTrace = {
    whoSent: {
      userName: 'Kullanıcı',
      isNewUser: false,
      recognitionText: 'Aktif kullanıcı etkileşimi.',
    },
    relationship: {
      warmthScore: warmthAfter,
      warmthLabel: warmthAfter >= 70 ? 'Sıcak' : warmthAfter >= 40 ? 'Dengeli' : 'Mesafeli',
      note: `İlişki sıcaklığı ${warmthDelta >= 0 ? '+' : ''}${warmthDelta} değişti.`,
    },
    currentMood: {
      moodText: nextDynamicState.lastStatus,
      reasonText: `Mesajın ${sentiment} sinyali ve ${intent} amacı değerlendirildi.`,
    },
    messageInterpretation: {
      intent,
      sentiment,
      explanation: `KDM mesajı sınıflandırdı ve davranış profiliyle çaprazladı.`,
    },
    decision: {
      chosenTone: behaviorProfile.tone,
      explanation: `${behaviorProfile.decisionSpeed} karar stili ve mevcut kişilik parametreleri uygulandı.`,
    },
    memoryUpdate: {
      warmthBefore,
      warmthAfter,
      warmthDelta,
      moodChange: moodChangeFromDelta(warmthDelta),
      reason: `KDM ${intent}/${sentiment} etkileşimini dinamik durum değişimine dönüştürdü.`,
    },
  };

  return { trace, behaviorProfile, nextDynamicState };
}
