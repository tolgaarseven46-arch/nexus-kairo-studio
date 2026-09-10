import { describe, expect, it } from 'vitest';
import { resolveKairaChatRequestCoordinationIdentity } from './kairaChatRequestCoordinationIdentity';

describe('requestId-less chat coordination neighbor proof regression', () => {
  it('reported: requestId-less direct chat execution receives an internal non-replayable coordination identity', () => {
    const identity = resolveKairaChatRequestCoordinationIdentity(undefined, () => 'reported');

    expect(identity).toEqual({
      requestId: '',
      coordinationRequestId: 'internal:reported',
      replayable: false,
    });
  });

  it('neighbor-1: whitespace-only requestId follows the same internal coordination path', () => {
    const identity = resolveKairaChatRequestCoordinationIdentity('   ', () => 'neighbor-1');

    expect(identity.requestId).toBe('');
    expect(identity.coordinationRequestId).toBe('internal:neighbor-1');
    expect(identity.replayable).toBe(false);
  });

  it('neighbor-2: separate requestId-less executions remain distinct rather than becoming accidental retries', () => {
    const first = resolveKairaChatRequestCoordinationIdentity(null, () => 'neighbor-2-a');
    const second = resolveKairaChatRequestCoordinationIdentity(null, () => 'neighbor-2-b');

    expect(first.coordinationRequestId).not.toBe(second.coordinationRequestId);
    expect(first.replayable).toBe(false);
    expect(second.replayable).toBe(false);
  });

  it('counterexample: caller-supplied requestId preserves the existing replayable identity contract', () => {
    const identity = resolveKairaChatRequestCoordinationIdentity('client-retry-42', () => 'unused');

    expect(identity).toEqual({
      requestId: 'client-retry-42',
      coordinationRequestId: 'client-retry-42',
      replayable: true,
    });
  });
});
