import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('controlled spontaneity observability contracts', () => {
  it('persists explicit local none and the AI decision in KNT traces', async () => {
    const server = await readFile('server.ts', 'utf8');
    const localStart = server.indexOf("const saveKntTelemetry = () =>");
    const localEnd = server.indexOf("let criticalPersistenceMs", localStart);
    const aiStart = server.indexOf("providerUsed: activeAiProviderUsed", localEnd);

    expect(localStart).toBeGreaterThan(-1);
    expect(localEnd).toBeGreaterThan(localStart);
    expect(aiStart).toBeGreaterThan(localEnd);

    const localKnt = server.slice(localStart, localEnd);
    expect(localKnt).toContain('providerUsed: "local_language"');
    expect(localKnt).toContain('reason: "local_language_short_circuit"');
    expect(server.slice(aiStart)).toContain("controlledSpontaneity: spontaneityDecision");
  });

  it('exposes controlled spontaneity in both local and AI API KDM responses', async () => {
    const server = await readFile('server.ts', 'utf8');
    expect(server).toContain('responsePlan, controlledSpontaneity: { mode: \"none\", eligible: false, probability: 0, roll: 0, reason: \"local_language_short_circuit\" } }');
    expect(server).toContain('responsePlan, controlledSpontaneity: spontaneityDecision }');
  });

  it('keeps canonical persistence metadata typed for the observable decision', async () => {
    const persistence = await readFile('src/services/kdmPersistenceService.ts', 'utf8');
    const matches = persistence.match(/controlledSpontaneity\?: unknown;/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('projects the server decision through the client chat response', async () => {
    const client = await readFile('src/services/droitChatService.ts', 'utf8');
    expect(client).toContain('controlledSpontaneity?: unknown;');
    expect(client).toContain('controlledSpontaneity: data.kdm?.controlledSpontaneity');
  });

  it('keeps the KNT trace endpoint available for post-turn inspection', async () => {
    const server = await readFile('server.ts', 'utf8');
    expect(server).toContain('app.get(\"/api/knt/traces\"');
    expect(server).toContain('loadRecentKntTraces');
  });
});
