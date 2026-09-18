import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

describe('chat idempotency server integration contracts', () => {
  it('claims coordination identity before language understanding and KDM work', () => {
    const identityIndex = serverSource.indexOf('resolveKairaChatRequestCoordinationIdentity(');
    const claimIndex = serverSource.indexOf('claimCoordinatedKairaChatRequest<any>(coordinationKey)', identityIndex);
    const languageIndex = serverSource.indexOf('const languageUnderstanding = await resolveServerLanguageUnderstanding', claimIndex);
    const kdmIndex = serverSource.indexOf('analyzeKdmInteractionCanonicalTurn(', claimIndex);

    expect(identityIndex).toBeGreaterThan(-1);
    expect(claimIndex).toBeGreaterThan(identityIndex);
    expect(languageIndex).toBeGreaterThan(claimIndex);
    expect(kdmIndex).toBeGreaterThan(claimIndex);
  });

  it('replays or waits without entering the mutable turn pipeline', () => {
    expect(serverSource).toContain('if (claim.kind === "replay") return res.json(claim.payload);');
    expect(serverSource).toContain('if (claim.kind === "wait")');
    expect(serverSource).toContain('if (outcome.ok === true) return res.json(outcome.payload);');
  });

  it('completes AI responses through the standard gate and fast local responses after lease-held continuity', () => {
    expect(serverSource).toContain('await sendChatPayload(responsePayload)');
    expect(serverSource).toContain('sendFirstEncounterFastPayload(responsePayload)');
    expect(serverSource).toContain('await persistFirstEncounterContinuity()');
    expect(serverSource).toContain('await completeCoordinatedKairaChatRequest(coordinationKey, responsePayload)');
  });

  it('releases an owned coordination claim when the request fails', () => {
    expect(serverSource).toContain('failCoordinatedKairaChatRequest(coordinationKey, e)');
    expect(serverSource).toContain('ownsCoordinationClaim = false;');
  });
});
