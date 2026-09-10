import { describe, expect, it } from 'vitest';
import { resolveKairaChatRequestCoordinationIdentity } from './kairaChatRequestCoordinationIdentity';

describe('Kaira chat request coordination identity', () => {
  it('preserves an external requestId as replayable coordination identity', () => {
    const result = resolveKairaChatRequestCoordinationIdentity('req-123', () => 'internal-unused');

    expect(result).toEqual({
      requestId: 'req-123',
      coordinationRequestId: 'req-123',
      replayable: true,
    });
  });

  it('creates a non-replayable internal identity when requestId is absent', () => {
    const result = resolveKairaChatRequestCoordinationIdentity(undefined, () => 'internal-456');

    expect(result).toEqual({
      requestId: '',
      coordinationRequestId: 'internal-456',
      replayable: false,
    });
  });

  it('keeps distinct requestId-less turns distinct while still giving each one a coordination identity', () => {
    let n = 0;
    const factory = () => `internal-${++n}`;

    const first = resolveKairaChatRequestCoordinationIdentity('', factory);
    const second = resolveKairaChatRequestCoordinationIdentity('   ', factory);

    expect(first.coordinationRequestId).toBe('internal-1');
    expect(second.coordinationRequestId).toBe('internal-2');
    expect(first.coordinationRequestId).not.toBe(second.coordinationRequestId);
    expect(first.replayable).toBe(false);
    expect(second.replayable).toBe(false);
  });
});
