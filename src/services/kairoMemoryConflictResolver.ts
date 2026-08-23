export interface MemoryCandidate { text: string; createdAt?: string; }

export function resolveMemoryConflict(candidates: MemoryCandidate[]): MemoryCandidate[] {
  const normalized = candidates
    .filter((item) => item.text?.trim())
    .map((item) => ({ ...item, text: item.text.trim() }));

  const groups = new Map<string, MemoryCandidate>();
  for (const candidate of normalized) {
    const key = candidate.text
      .toLocaleLowerCase('tr-TR')
      .replace(/\b(eski|artık|şimdi|yeni|önceden|daha önce)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const previous = groups.get(key);
    if (!previous || (candidate.createdAt || '') > (previous.createdAt || '')) groups.set(key, candidate);
  }
  return [...groups.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function memoryConfidence(text: string, createdAt?: string): number {
  let score = 50;
  if (text.length >= 12) score += 10;
  if (/(benim|adım|ismim|hedefim|seviyorum|ilgileniyorum|çalışıyorum|geliştiriyorum)/i.test(text)) score += 20;
  if (createdAt) {
    const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 86400000);
    score += ageDays < 7 ? 15 : ageDays < 30 ? 8 : 0;
  }
  return Math.min(100, score);
}
