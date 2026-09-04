import { describe, expect, it } from 'vitest';
import { validateMemoryAgainstMessage } from './kairoMemoryConsistency';

describe('persistent memory relevance regression', () => {
  const memories = [
    'Mert yarın istifa edecek ve müdürle konuşacak.',
    'Bugün toplantılar çok uzun sürdü.',
    'Tolga kahveyi şekersiz seviyor.',
  ];

  const retrieve = (message: string) =>
    memories.filter((memory) => validateMemoryAgainstMessage(memory, message).accepted);

  it('does not expose unrelated old memories for a fresh emotional opening', () => {
    expect(retrieve('bugün baya yoruldum')).toEqual([]);
  });

  it('does not expose arbitrary old memories merely because the user says benim', () => {
    expect(retrieve('benim yeni kulaklığım bozuldu')).toEqual([]);
  });

  it('still exposes the anchored Mert memory for an explicit recall', () => {
    expect(retrieve('Mert yarın ne yapacaktı')).toEqual([
      'Mert yarın istifa edecek ve müdürle konuşacak.',
    ]);
  });

  it('still exposes a concrete preference memory when its topic is queried', () => {
    expect(retrieve('kahveyi nasıl seviyorum')).toEqual([
      'Tolga kahveyi şekersiz seviyor.',
    ]);
  });
});
