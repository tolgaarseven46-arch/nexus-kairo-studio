import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deep persistent recall server wiring regression', () => {
  it('routes only canonical grounded recall through the deeper persisted-memory window', () => {
    const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
    expect(server).toContain('persistentMemoryFetchLimitForDialogueMove(dialogueDecision.move)');
    expect(server).toContain('loadRecentKdmMemory(FAST_RECENT_MEMORY_LIMIT, scopedUserId)');
    expect(server).toContain('persistentMemoryFetchLimitForDialogueMove(dialogueDecision.move),');
    expect(server).toContain('stateUserId,');
  });

  it('allows the bounded archive loader to serve the 40-record recall policy', () => {
    const persistence = readFileSync(
      resolve(process.cwd(), 'src/services/kdmPersistenceService.ts'),
      'utf8',
    );
    expect(persistence).toContain('Math.min(maxItems, 100)');
  });
});
