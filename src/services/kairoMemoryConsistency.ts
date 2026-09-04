export interface MemoryConsistencyResult {
  accepted: boolean;
  score: number;
  reason: string;
}

const GENERIC_MEMORY_LINK_TOKENS = new Set([
  'benim',
  'geçmiş',
  'önce',
  'bugün',
  'yarın',
  'hatırla',
  'hatırlıyor',
  'hatırlıyorum',
  'neydi',
  'nasıl',
  'neden',
  'niye',
  'daha',
]);

function memoryTokens(text: string) {
  return Array.from(
    new Set(
      text
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-zçğıöşü0-9\s]/giu, ' ')
        .split(/\s+/u)
        .filter((token) => token.length >= 4),
    ),
  );
}

export function validateMemoryAgainstMessage(memoryText: string, userMessage: string): MemoryConsistencyResult {
  const memory = memoryText.trim();
  const message = userMessage.trim();
  if (!memory) return { accepted: false, score: 0, reason: 'Boş hafıza kaydı.' };
  if (!message) return { accepted: false, score: 0, reason: 'Boş kullanıcı mesajı.' };

  const persistedTokens = memoryTokens(memory);
  const queryTokens = memoryTokens(message);
  const persistedSet = new Set(persistedTokens);
  const topicalQueryTokens = queryTokens.filter((token) => !GENERIC_MEMORY_LINK_TOKENS.has(token));
  const topicalOverlap = topicalQueryTokens.filter((token) => persistedSet.has(token));
  const recallCue = /(hatırla|hatırlıyor|geçmiş|daha önce|benim|ilgim|hedefim|seviyorum)/iu.test(userMessage);

  // Persistent memory must have a topical anchor. Generic recall/temporal words alone
  // are not enough to expose an old memory to the response model.
  const queryCoverage = topicalQueryTokens.length
    ? topicalOverlap.length / topicalQueryTokens.length
    : 0;
  const accepted = topicalOverlap.length >= 2 || (topicalOverlap.length >= 1 && queryCoverage >= 0.3);
  const score = Math.min(
    1,
    queryCoverage + (topicalOverlap.length >= 2 ? 0.2 : 0) + (recallCue && topicalOverlap.length ? 0.1 : 0),
  );

  return {
    accepted,
    score: Math.round(score * 100),
    reason: accepted
      ? 'Hafıza mevcut mesajla konu düzeyinde yeterli bağ kuruyor.'
      : topicalOverlap.length === 0
        ? 'Hafıza yalnızca genel/temporal kelimelerle eşleşiyor; cevap modeline verilmemeli.'
        : 'Hafıza mevcut mesajla yeterli konu bağı kurmuyor; cevapta kullanılmamalı.',
  };
}
