import { describe, expect, it } from 'vitest';
import {
  DEEP_RECALL_MEMORY_LIMIT,
  FAST_RECENT_MEMORY_LIMIT,
  persistentMemoryFetchLimitForDialogueMove,
} from './kairaPersistentMemoryRetrievalPolicy';

describe('deep persistent recall regression', () => {
  it('keeps normal conversation on the small recent-memory window', () => {
    expect(persistentMemoryFetchLimitForDialogueMove('natural_reaction')).toBe(
      FAST_RECENT_MEMORY_LIMIT,
    );
  });

  it('uses a deeper archive only for canonical grounded recall', () => {
    expect(persistentMemoryFetchLimitForDialogueMove('grounded_recall')).toBe(
      DEEP_RECALL_MEMORY_LIMIT,
    );
    expect(DEEP_RECALL_MEMORY_LIMIT).toBeGreaterThan(24);
  });
});
