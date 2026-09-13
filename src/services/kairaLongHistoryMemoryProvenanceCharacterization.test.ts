import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const persistenceSource = readFileSync(
  new URL('./kdmPersistenceService.ts', import.meta.url),
  'utf8',
);

const memoryItemContract =
  persistenceSource.match(/export interface KdmMemoryItem\s*\{([\s\S]*?)\}/)?.[1] ?? '';

const saveInteractionBody =
  persistenceSource.match(/export async function saveKdmInteraction[\s\S]*?\n\}/)?.[0] ?? '';

const loadMemoryBody =
  persistenceSource.match(/export async function loadRecentKdmMemory[\s\S]*?\n\}/)?.[0] ?? '';

describe('long-history persistent-memory provenance characterization', () => {
  it('keeps a stable persisted source id on retrieved memory evidence', () => {
    expect(memoryItemContract).toMatch(/(?:sourceId|memoryId|id)\??:\s*string/);
    expect(loadMemoryBody).toMatch(/(?:sourceId|memoryId|id)\s*:\s*item\.id/);
  });

  it('persists the canonical semantic snapshot with the memory trace', () => {
    expect(saveInteractionBody).toContain(
      'semanticInterpretation: payload.semanticInterpretation',
    );
  });

  it('returns the persisted canonical semantic snapshot with retrieved evidence', () => {
    expect(memoryItemContract).toMatch(
      /semanticInterpretation\??:\s*SemanticInterpretation/,
    );
    expect(loadMemoryBody).toMatch(
      /semanticInterpretation\s*:\s*data\.semanticInterpretation/,
    );
  });
});
