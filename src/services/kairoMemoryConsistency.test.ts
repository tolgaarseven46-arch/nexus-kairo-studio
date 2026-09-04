import { describe, expect, it } from 'vitest';
import { validateMemoryAgainstMessage } from './kairoMemoryConsistency';

describe('validateMemoryAgainstMessage', () => {
  it('rejects a persistent memory matched only by a generic recall cue', () => {
    const result = validateMemoryAgainstMessage(
      'Mert yarın istifa edecek ve müdürle konuşacak.',
      'benim kahve tercihim neydi',
    );

    expect(result.accepted).toBe(false);
  });

  it('rejects a persistent memory matched only by a temporal word', () => {
    const result = validateMemoryAgainstMessage(
      'Bugün toplantılar çok uzun sürdü.',
      'bugün baya yoruldum',
    );

    expect(result.accepted).toBe(false);
  });

  it('keeps an anchored recall when the same subject is present', () => {
    const result = validateMemoryAgainstMessage(
      'Mert yarın istifa edecek ve müdürle konuşacak.',
      'Mert yarın ne yapacaktı',
    );

    expect(result.accepted).toBe(true);
  });

  it('keeps a concrete preference recall with a topical anchor', () => {
    const result = validateMemoryAgainstMessage(
      'Tolga kahveyi şekersiz seviyor.',
      'kahveyi nasıl seviyorum',
    );

    expect(result.accepted).toBe(true);
  });
});
