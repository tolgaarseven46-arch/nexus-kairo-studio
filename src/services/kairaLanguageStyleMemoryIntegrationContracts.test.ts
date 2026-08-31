import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const server = readFileSync('server.ts', 'utf8');
const persistence = readFileSync('src/services/kdmPersistenceService.ts', 'utf8');
const languageMemory = readFileSync('src/services/kairoLanguageMemory.ts', 'utf8');

describe('learned language HOW server integration contracts', () => {
  it('derives the signal only after language-memory hydration and injects HOW below SpeechIdentity', () => {
    const hydrate = server.indexOf('hydrateLanguageMemory(stateUserId)');
    const signal = server.indexOf('languageStyleMemory = languageStyleMemorySignal(stateUserId)');
    const speechPrompt = server.indexOf('${speechIdentityPrompt(speech)}');
    const learnedPrompt = server.indexOf('${languageStyleMemoryInstruction(stateUserId)}');
    const socialStyle = server.indexOf('${socialStyle}');

    expect(hydrate).toBeGreaterThan(-1);
    expect(signal).toBeGreaterThan(hydrate);
    expect(speechPrompt).toBeGreaterThan(-1);
    expect(learnedPrompt).toBeGreaterThan(speechPrompt);
    expect(socialStyle).toBeGreaterThan(learnedPrompt);
  });

  it('records the same derived signal on both local and AI KNT/test-session observability paths', () => {
    expect(server).toContain('providerUsed: "local_language",\n          languageStyleMemory,');
    expect(server).toContain('providerUsed: activeAiProviderUsed,\n        languageStyleMemory,');
    expect(server).toContain('providerUsed: "local_language",\n            languageStyleMemory,');
    expect(server).toContain('providerUsed: activeAiProviderUsed,\n          languageStyleMemory,');
    expect(persistence.match(/languageStyleMemory\?: unknown/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps learned language memory strictly HOW-only and subordinate to canonical authorities', () => {
    expect(languageMemory).toContain('ÖĞRENİLMİŞ YAZIM ALIŞKANLIĞI (HOW-ONLY, DÜŞÜK OTORİTE)');
    expect(languageMemory).toContain('içerik, anı, olay, niyet veya davranış izni üretmez');
    expect(languageMemory).toContain('ResponsePlan izinleri ile SpeechIdentity ilişki/register sınırları her zaman üstündür');
    expect(languageMemory).toContain("if(signal.maturity==='cold')return''");
  });
});
