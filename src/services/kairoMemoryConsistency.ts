export interface MemoryConsistencyResult {
  accepted: boolean;
  score: number;
  reason: string;
}

export function validateMemoryAgainstMessage(memoryText: string, userMessage: string): MemoryConsistencyResult {
  const memory = memoryText.trim().toLowerCase();
  const message = userMessage.trim().toLowerCase();
  if (!memory) return { accepted: false, score: 0, reason: 'Boş hafıza kaydı.' };
  if (!message) return { accepted: false, score: 0, reason: 'Boş kullanıcı mesajı.' };

  const memoryTokens = new Set(memory.split(/\s+/).filter((token) => token.length >= 4));
  const messageTokens = new Set(message.split(/\s+/).filter((token) => token.length >= 4));
  let overlap = 0;
  for (const token of memoryTokens) if (messageTokens.has(token)) overlap++;
  const lexicalScore = memoryTokens.size ? overlap / memoryTokens.size : 0;
  const contextual = /(hatırla|hatırlıyor|geçmiş|daha önce|benim|ilgim|hedefim|seviyorum)/i.test(userMessage) ? 0.25 : 0;
  const score = Math.min(1, lexicalScore + contextual);

  return {
    accepted: score >= 0.2,
    score: Math.round(score * 100),
    reason: score >= 0.2 ? 'Hafıza mevcut mesajla yeterli bağ kuruyor.' : 'Hafıza mevcut mesajla yeterli bağ kurmuyor; cevapta kullanılmamalı.',
  };
}
