import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

describe('chat idempotency server integration contracts', () => {
  it('starts coordination before language understanding and settles it before mutable turn work', () => {
    const identityIndex = serverSource.indexOf('resolveKairaChatRequestCoordinationIdentity(');
    const claimIndex = serverSource.indexOf('claimCoordinatedKairaChatRequest<any>(coordinationKey, {', identityIndex);
    const languageIndex = serverSource.indexOf('const languageUnderstanding = await resolveServerLanguageUnderstanding', claimIndex);
    const settleAfterSemantic = serverSource.indexOf(
      'if (coordinationClaimPromise && canOverlapFirstEncounterCoordination)',
      languageIndex,
    );
    const kdmIndex = serverSource.indexOf('analyzeKdmInteractionCanonicalTurn(', settleAfterSemantic);

    expect(identityIndex).toBeGreaterThan(-1);
    expect(claimIndex).toBeGreaterThan(identityIndex);
    expect(languageIndex).toBeGreaterThan(claimIndex);
    expect(settleAfterSemantic).toBeGreaterThan(languageIndex);
    expect(kdmIndex).toBeGreaterThan(settleAfterSemantic);
  });

  it('replays or waits without entering the mutable turn pipeline', () => {
    const helperStart = serverSource.indexOf('const settleCoordinationClaim = async () =>');
    const helperEnd = serverSource.indexOf('const assertStateMutationOwnership', helperStart);
    const helper = serverSource.slice(helperStart, helperEnd);

    expect(helper).toContain('if (claim.kind === "replay")');
    expect(helper).toContain('res.json(claim.payload);');
    expect(helper).toContain('if (claim.kind === "wait")');
    expect(helper).toContain('if (outcome.ok === true)');
    expect(helper).toContain('res.json(outcome.payload);');
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
