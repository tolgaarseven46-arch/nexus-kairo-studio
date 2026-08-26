export interface LanguageMemoryProfile {
  wordWeights: Record<string, number>;
  phraseWeights: Record<string, number>;
  recentReplies: string[];
  interactionCount: number;
}

const profiles = new Map<string, LanguageMemoryProfile>();

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

function createProfile(): LanguageMemoryProfile {
  return { wordWeights: { ...BASE_WORDS }, phraseWeights: {}, recentReplies: [], interactionCount: 0 };
}

export function getLanguageMemory(userId: string): LanguageMemoryProfile {
  let profile = profiles.get(userId);
  if (!profile) { profile = createProfile(); profiles.set(userId, profile); }
  return profile;
}

export function learnLanguageReply(userId: string, reply: string) {
  const profile = getLanguageMemory(userId);
  profile.interactionCount += 1;
  const normalized = reply.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9\s:)]/gi, ' ').replace(/\s+/g, ' ').trim();
  for (const word of normalized.split(' ')) {
    if (word.length < 2) continue;
    profile.wordWeights[word] = Math.min(30, (profile.wordWeights[word] ?? 0) + 0.35);
  }
  profile.phraseWeights[normalized] = Math.min(20, (profile.phraseWeights[normalized] ?? 0) + 1);
  profile.recentReplies = [reply, ...profile.recentReplies.filter(x => x !== reply)].slice(0, 8);
}

export function languageAffinity(userId: string, reply: string): number {
  const profile = getLanguageMemory(userId);
  const words = reply.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9\s]/gi, ' ').split(/\s+/).filter(Boolean);
  const wordScore = words.reduce((sum, word) => sum + (profile.wordWeights[word] ?? 0), 0) / Math.max(1, words.length);
  const phraseScore = profile.phraseWeights[reply.toLocaleLowerCase('tr-TR').trim()] ?? 0;
  const repetitionPenalty = profile.recentReplies.includes(reply) ? 5 : 0;
  return wordScore + phraseScore * 1.5 - repetitionPenalty;
}

export function chooseLanguageReply(userId: string, candidates: string[], seed: string): string {
  const profile = getLanguageMemory(userId);
  let hash = 0; for (let i=0;i<seed.length;i++) hash=(hash*31+seed.charCodeAt(i))>>>0;
  return [...candidates].map((reply,index)=>({reply,index,score:languageAffinity(userId,reply)+(((hash+index*17)%100)/100)*1.25}))
    .sort((a,b)=>b.score-a.score)[0]?.reply ?? candidates[0];
}

export function languageMemorySummary(userId: string) {
  const p = getLanguageMemory(userId);
  return {
    interactionCount: p.interactionCount,
    favoriteWords: Object.entries(p.wordWeights).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([word,weight])=>({word,weight:Number(weight.toFixed(2))})),
    recentReplies: p.recentReplies.slice(0,5),
  };
}
