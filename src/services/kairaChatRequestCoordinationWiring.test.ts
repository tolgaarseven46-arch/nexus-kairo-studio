import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('server chat request coordination wiring', () => {
  const serverSource = readFileSync('server.ts', 'utf8');

  it('assigns every chat turn a coordination identity before claiming ownership', () => {
    expect(serverSource).toContain('resolveKairaChatRequestCoordinationIdentity(');
    expect(serverSource).toContain('incomingRequestId,\n      randomUUID,');
    expect(serverSource).toContain('requestIdentity.coordinationRequestId');
    expect(serverSource).toContain('claimCoordinatedKairaChatRequest<any>(coordinationKey)');
  });

  it('does not gate state-owner coordination on the presence of an external requestId', () => {
    expect(serverSource).not.toContain('coordinationKey = requestId ?');
    expect(serverSource).not.toContain('idempotencyKey = requestId ?');
    expect(serverSource).toContain('const requestId = requestIdentity.requestId;');
  });

  it('releases the same coordination claim on both success and failure paths', () => {
    expect(serverSource).toContain('completeCoordinatedKairaChatRequest(coordinationKey, payload)');
    expect(serverSource).toContain('failCoordinatedKairaChatRequest(coordinationKey, e)');
  });
});
