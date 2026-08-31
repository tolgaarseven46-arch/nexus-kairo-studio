import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

describe('chat idempotency server integration contracts', () => {
  it('claims request identity before language understanding and KDM work', () => {
    const claimIndex = serverSource.indexOf('claimKairaChatRequest<any>(idempotencyKey)');
    const languageIndex = serverSource.indexOf('const languageUnderstanding = await resolveServerLanguageUnderstanding', claimIndex);
    const kdmIndex = serverSource.indexOf('analyzeKdmInteraction(', claimIndex);

    expect(claimIndex).toBeGreaterThan(-1);
    expect(languageIndex).toBeGreaterThan(claimIndex);
    expect(kdmIndex).toBeGreaterThan(claimIndex);
  });

  it('replays or waits without entering the mutable turn pipeline', () => {
    expect(serverSource).toContain('if (claim.kind === "replay") return res.json(claim.payload);');
    expect(serverSource).toContain('if (claim.kind === "wait")');
    expect(serverSource).toContain('if (outcome.ok === true) return res.json(outcome.payload);');
  });

  it('completes both local and AI final responses through one payload gate', () => {
    const occurrences = serverSource.match(/sendChatPayload\(\{/g) ?? [];
    expect(occurrences).toHaveLength(2);
    expect(serverSource).toContain('completeKairaChatRequest(idempotencyKey, payload)');
  });

  it('releases an owned claim when the request fails', () => {
    expect(serverSource).toContain('failKairaChatRequest(idempotencyKey, e)');
    expect(serverSource).toContain('ownsIdempotencyClaim = false;');
  });
});
