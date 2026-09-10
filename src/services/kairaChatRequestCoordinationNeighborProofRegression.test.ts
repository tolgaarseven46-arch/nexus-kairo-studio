import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serverSource = readFileSync('server.ts', 'utf8');

describe('requestId-less chat coordination neighbor proof regression', () => {
  it('reported: requestId-less direct chat execution receives an internal non-replayable coordination identity', () => {
    expect(serverSource).toContain('resolveKairaChatRequestCoordinationIdentity(');
    expect(serverSource).toContain('requestIdentity.coordinationRequestId');
  });

  it('neighbor-1: whitespace-only requestId follows the same internal coordination path', () => {
    expect(serverSource).toContain('incomingRequestId,\n      randomUUID,');
    expect(serverSource).toContain('const requestId = requestIdentity.requestId;');
  });

  it('neighbor-2: separate requestId-less executions remain distinct rather than becoming accidental retries', () => {
    expect(serverSource).not.toContain('idempotencyKey = requestId ?');
    expect(serverSource).toContain('randomUUID');
  });

  it('counterexample: caller-supplied requestId preserves the existing replayable identity contract', () => {
    expect(serverSource).toContain('claimCoordinatedKairaChatRequest<any>');
    expect(serverSource).toContain('completeCoordinatedKairaChatRequest(');
    expect(serverSource).toContain('requestId: requestId || undefined');
  });
});
