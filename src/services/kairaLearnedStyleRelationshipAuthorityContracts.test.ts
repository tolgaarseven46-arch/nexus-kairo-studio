import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { findKairoResponseRhythmIssues } from './kairoResponseRhythm';

describe('learned language style vs relationship HOW authority', () => {
  it('keeps close-only address blocked for new/familiar social replies', () => {
    expect(
      findKairoResponseRhythmIssues('iyiyim kanka', [], 'natural_reaction', 'new'),
    ).toContain('Kaira ilişki seviyesi close olmadan aşırı samimi hitap kullandı');
    expect(
      findKairoResponseRhythmIssues('iyiyim kanka', [], 'natural_reaction', 'familiar'),
    ).toContain('Kaira ilişki seviyesi close olmadan aşırı samimi hitap kullandı');
    expect(
      findKairoResponseRhythmIssues('iyiyim kanka', [], 'natural_reaction', 'close'),
    ).toEqual([]);
  });

  it('passes the canonical SpeechIdentity relationship level through every AI rhythm validation seam', async () => {
    const server = await readFile('server.ts', 'utf8');
    const matches = server.match(/findKairoResponseRhythmIssues\([^\n]+speech\.relationshipLevel\)/g) ?? [];
    expect(matches).toHaveLength(5);
  });

  it('keeps learned language memory explicitly lower-authority than SpeechIdentity and ResponsePlan', async () => {
    const memory = await readFile('src/services/kairoLanguageMemory.ts', 'utf8');
    expect(memory).toContain('HOW-ONLY, DÜŞÜK OTORİTE');
    expect(memory).toContain('ResponsePlan izinleri ile SpeechIdentity ilişki/register sınırları her zaman üstündür.');
  });

  it('does not apply the close-only slang guard to factual answer moves', () => {
    expect(
      findKairoResponseRhythmIssues('kanka kelimesinin anlamı arkadaş gibi', [], 'answer_or_clarify', 'new'),
    ).toEqual([]);
  });
});
