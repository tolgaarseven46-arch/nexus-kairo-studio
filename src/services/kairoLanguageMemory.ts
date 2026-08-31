import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface LanguageMemoryProfile {
  wordWeights: Record<string, number>;
  phraseWeights: Record<string, number>;
  recentReplies: string[];
  interactionCount: number;
}

export interface LanguageStyleMemorySignal {
  interactionCount: number;
  maturity: 'cold' | 'emerging' | 'learned';
  preferredMarkers: string[];
  averageWords: number;
  lengthPreference: 'very_short' | 'short' | 'medium';
}

const profiles = new Map<string, LanguageMemoryProfile>();
const hydrated = new Set<string>();
const hydrationPromises = new Map<string, Promise<void>>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const BASE_WORDS: Record<string, number> = {
  kanka: 8,
  ya: 7,
  valla: 5,
  aynen: 5,
  he: 3,
  iyidir: 4,
  takılıyorum: 4,
  senden: 4,
};
const STYLE_MARKERS = ['kanka', 'ya', 'valla', 'aynen', 'he', 'be', 'işte', 'hani', 'yani', 'neyse', 'eyvallah', 'hadi', 'falan', 'filan', 'harbi', 'cidden'] as const;
const MAX_WORD_WEIGHTS = 128;
const MAX_PHRASE_WEIGHTS = 64;
const MAX_LEARNED_WORD_DELTA = 2.1;
const RECENCY_PENALTIES = [12, 8, 5, 3, 2, 1, 1, 1];
const LEARNED_MARKER_DELTA = 0.69;

function createProfile(): LanguageMemoryProfile {
  return { wordWeights: { ...BASE_WORDS }, phraseWeights: {}, recentReplies: [], interactionCount: 0 };
}

function safeId(userId: string) {
  return encodeURIComponent(userId || 'anonymous').replace(/%/g, '_');
}

function normalizeLanguageText(value: string) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-zçğıöşü0-9\s]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function boundedWeights(raw: unknown, maxKeys: number, maxWeight: number, pinned: Record<string, number> = {}) {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const entries = Object.entries(source)
    .map(([key, value], index) => ({ key, weight: Number(value), index }))
    .filter((item) => item.key && Number.isFinite(item.weight) && item.weight >= 0)
    .map((item) => ({ ...item, weight: Math.min(maxWeight, item.weight) }));
  const pinnedKeys = new Set(Object.keys(pinned));
  const ranked = entries.sort((a, b) => {
    const ap = pinnedKeys.has(a.key) ? 1 : 0;
    const bp = pinnedKeys.has(b.key) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return b.index - a.index;
  });
  const result: Record<string, number> = { ...pinned };
  for (const item of ranked) {
    if (Object.keys(result).length >= maxKeys && !Object.prototype.hasOwnProperty.call(result, item.key)) continue;
    result[item.key] = Math.max(result[item.key] ?? 0, item.weight);
  }
  return result;
}

function learnedWordCap(word: string) {
  return (BASE_WORDS[word] ?? 0) + MAX_LEARNED_WORD_DELTA;
}

function boundedLanguageWords(raw: unknown) {
  const result = boundedWeights(raw, MAX_WORD_WEIGHTS, 30, BASE_WORDS);
  for (const word of Object.keys(result)) result[word] = Math.min(result[word], learnedWordCap(word));
  return result;
}

function sanitize(raw: any): LanguageMemoryProfile {
  return {
    wordWeights: boundedLanguageWords(raw?.wordWeights),
    phraseWeights: boundedWeights(raw?.phraseWeights, MAX_PHRASE_WEIGHTS, 20),
    recentReplies: Array.isArray(raw?.recentReplies) ? raw.recentReplies.filter((x: any) => typeof x === 'string').slice(0, 8) : [],
    interactionCount: Number.isFinite(Number(raw?.interactionCount)) ? Math.max(0, Number(raw.interactionCount)) : 0,
  };
}

export function getLanguageMemory(userId: string) {
  let profile = profiles.get(userId);
  if (!profile) {
    profile = createProfile();
    profiles.set(userId, profile);
  }
  return profile;
}

export async function hydrateLanguageMemory(userId: string) {
  if (hydrated.has(userId)) return;
  const existing = hydrationPromises.get(userId);
  if (existing) return existing;
  const task = (async () => {
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'kairoLanguageMemory', safeId(userId))),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (snap && 'exists' in snap && snap.exists()) profiles.set(userId, sanitize(snap.data()));
    } catch (error) {
      console.warn('[LanguageMemory] hydrate skipped', error);
    } finally {
      hydrated.add(userId);
      hydrationPromises.delete(userId);
    }
  })();
  hydrationPromises.set(userId, task);
  return task;
}

async function persist(userId: string) {
  const profile = getLanguageMemory(userId);
  try {
    await setDoc(doc(db, 'kairoLanguageMemory', safeId(userId)), { ...profile, updatedAt: serverTimestamp() });
  } catch (error) {
    console.warn('[LanguageMemory] persist skipped', error);
  }
}

function schedulePersist(userId: string) {
  const old = saveTimers.get(userId);
  if (old) clearTimeout(old);
  saveTimers.set(userId, setTimeout(() => {
    saveTimers.delete(userId);
    void persist(userId);
  }, 500));
}

function repetitionPenalty(profile: LanguageMemoryProfile, reply: string) {
  const normalized = normalizeLanguageText(reply);
  const index = profile.recentReplies.findIndex((item) => normalizeLanguageText(item) === normalized);
  return index >= 0 ? (RECENCY_PENALTIES[index] ?? 1) : 0;
}

function affinityForProfile(profile: LanguageMemoryProfile, reply: string) {
  const normalized = normalizeLanguageText(reply);
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordScore = words.reduce((sum, word) => sum + (profile.wordWeights[word] ?? 0), 0) / Math.max(1, words.length);
  const phraseScore = Math.min(3, profile.phraseWeights[normalized] ?? 0);
  return wordScore + phraseScore * 0.8;
}

export function learnLanguageReply(userId: string, reply: string) {
  const profile = getLanguageMemory(userId);
  profile.interactionCount += 1;
  const normalized = normalizeLanguageText(reply);
  const replyWords = [...new Set(normalized.split(' ').filter((word) => word.length >= 2))];
  for (const word of replyWords) {
    profile.wordWeights[word] = Math.min(learnedWordCap(word), (profile.wordWeights[word] ?? 0) + 0.35);
  }
  if (normalized) profile.phraseWeights[normalized] = Math.min(20, (profile.phraseWeights[normalized] ?? 0) + 1);
  profile.wordWeights = boundedLanguageWords(profile.wordWeights);
  profile.phraseWeights = boundedWeights(profile.phraseWeights, MAX_PHRASE_WEIGHTS, 20);
  profile.recentReplies = [reply, ...profile.recentReplies.filter((x) => normalizeLanguageText(x) !== normalized)].slice(0, 8);
  schedulePersist(userId);
}

export function languageAffinity(userId: string, reply: string) {
  return affinityForProfile(getLanguageMemory(userId), reply);
}

export function chooseLanguageReply(userId: string, candidates: string[], seed: string, useLearnedMemory = true) {
  const profile = useLearnedMemory ? getLanguageMemory(userId) : createProfile();
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return [...candidates]
    .map((reply, index) => ({
      reply,
      score: affinityForProfile(profile, reply)
        - repetitionPenalty(profile, reply)
        + (((hash + index * 17) % 100) / 100) * 1.25,
    }))
    .sort((a, b) => b.score - a.score)[0]?.reply ?? candidates[0];
}

export function languageStyleMemorySignal(userId: string, useLearnedMemory = true): LanguageStyleMemorySignal {
  if (!useLearnedMemory) {
    return { interactionCount: 0, maturity: 'cold', preferredMarkers: [], averageWords: 0, lengthPreference: 'very_short' };
  }
  const profile = getLanguageMemory(userId);
  const preferredMarkers = STYLE_MARKERS
    .map((marker) => ({ marker, delta: (profile.wordWeights[marker] ?? 0) - (BASE_WORDS[marker] ?? 0) }))
    .filter((item) => item.delta >= LEARNED_MARKER_DELTA)
    .sort((a, b) => b.delta - a.delta || a.marker.localeCompare(b.marker, 'tr'))
    .slice(0, 4)
    .map((item) => item.marker);
  const wordCounts = profile.recentReplies
    .map((reply) => normalizeLanguageText(reply).split(/\s+/).filter(Boolean).length)
    .filter((count) => count > 0);
  const averageWords = wordCounts.length
    ? wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length
    : 0;
  const lengthPreference: LanguageStyleMemorySignal['lengthPreference'] = averageWords <= 4
    ? 'very_short'
    : averageWords <= 8
      ? 'short'
      : 'medium';
  const maturity = profile.interactionCount >= 12 ? 'learned' : profile.interactionCount >= 3 ? 'emerging' : 'cold';
  return {
    interactionCount: profile.interactionCount,
    maturity,
    preferredMarkers,
    averageWords: Number(averageWords.toFixed(1)),
    lengthPreference,
  };
}

export function languageStyleMemoryInstruction(userId: string, useLearnedMemory = true) {
  const signal = languageStyleMemorySignal(userId, useLearnedMemory);
  if (signal.maturity === 'cold') return '';
  const markers = signal.preferredMarkers.length ? signal.preferredMarkers.join(', ') : 'belirgin öğrenilmiş marker yok';
  return `ÖĞRENİLMİŞ YAZIM ALIŞKANLIĞI (HOW-ONLY, DÜŞÜK OTORİTE):\nOlgunluk=${signal.maturity}; örnek=${signal.interactionCount}; tipik uzunluk=${signal.lengthPreference} (~${signal.averageWords} kelime); güvenli tekrar eden discourse markerları=${markers}.\nBu sinyal yalnız yazım ritmi/kelime tercihini hafifçe etkiler; içerik, anı, olay, niyet veya davranış izni üretmez. Markerları zorla kullanma ve ham geçmiş cevapları/konuları yeniden üretme. ResponsePlan izinleri ile SpeechIdentity ilişki/register sınırları her zaman üstündür.`;
}

export function languageMemorySummary(userId: string) {
  const profile = getLanguageMemory(userId);
  return {
    interactionCount: profile.interactionCount,
    persistent: hydrated.has(userId),
    favoriteWords: Object.entries(profile.wordWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, weight]) => ({ word, weight: Number(weight.toFixed(2)) })),
    recentReplies: profile.recentReplies.slice(0, 5),
  };
}
