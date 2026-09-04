import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const server = readFileSync('server.ts', 'utf8');
const persistence = readFileSync('src/services/kdmPersistenceService.ts', 'utf8');
const languageMemory = readFileSync('src/services/kairoLanguageMemory.ts', 'utf8');

describe('learned language HOW server integration contracts', () => {
  it('derives the signal only after policy-gated language-memory hydration and injects HOW below SpeechIdentity', () => {
    const hydrate = server.indexOf('hydrateLanguageMemory(stateUserId)');
    const signal = server.indexOf('languageStyleMemory = languageStyleMemorySignal(stateUserId, kairaPolicy.persistentUserMemory)');
    const speechPrompt = server.indexOf('${speechIdentityPrompt(speech)}');
    const learnedPrompt = server.indexOf('${languageStyleMemoryInstruction(stateUserId, kairaPolicy.persistentUserMemory)}');
    const socialStyle = server.indexOf('${socialStyle}');

    expect(hydrate).toBeGreaterThan(-1);
    expect(signal).toBeGreaterThan(hydrate);
    expect(speechPrompt).toBeGreaterThan(-1);
    expect(learnedPrompt).toBeGreaterThan(speechPrompt);
    expect(socialStyle).toBeGreaterThan(learnedPrompt);
  });

  it('records the same derived signal on both local and AI KNT/test-session observability paths', () => {
    // Observability fields may grow over time, so assert path coverage instead of brittle adjacency/order.
    const localProviderOccurrences = server.match(/providerUsed: "local_language"/g)?.length ?? 0;
    const aiProviderOccurrences = server.match(/providerUsed: activeAiProviderUsed/g)?.length ?? 0;
    const languageStyleOccurrences = server.match(/\blanguageStyleMemory,/g)?.length ?? 0;

    expect(localProviderOccurrences).toBeGreaterThanOrEqual(2);
    expect(aiProviderOccurrences).toBeGreaterThanOrEqual(2);
    expect(languageStyleOccurrences).toBeGreaterThanOrEqual(4);
    expect(server).toContain('semanticInterpretation: canonicalSemantic.interpretation');
    expect(server).toContain('semanticEvent: canonicalSemantic.event');
    expect(server).toContain('semanticSource: canonicalSemantic.source');
    expect(persistence.match(/languageStyleMemory\?: unknown/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps learned language memory strictly HOW-only and subordinate to canonical authorities', () => {
    expect(languageMemory).toContain('ÖĞRENİLMİŞ YAZIM ALIŞKANLIĞI (HOW-ONLY, DÜŞÜK OTORİTE)');
    expect(languageMemory).toContain('içerik, anı, olay, niyet veya davranış izni üretmez');
    expect(languageMemory).toContain('ResponsePlan izinleri ile SpeechIdentity ilişki/register sınırları her zaman üstündür');
    expect(languageMemory).toMatch(/if\s*\(signal\.maturity\s*===\s*'cold'\)\s*return\s*''/u);
    expect(languageMemory).toContain('languageStyleMemorySignal(userId, useLearnedMemory)');
  });
});
