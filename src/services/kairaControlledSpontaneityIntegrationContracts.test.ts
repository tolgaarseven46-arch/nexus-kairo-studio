import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('controlled spontaneity server integration', () => {
  it('decides only after the canonical ResponsePlan exists', async () => {
    const server = await readFile('server.ts', 'utf8');
    const planIndex = server.indexOf('responsePlan = buildKairaResponsePlan');
    const spontaneityIndex = server.indexOf('spontaneityDecision = decideKairaControlledSpontaneity');

    expect(server).toContain('decideKairaControlledSpontaneity,');
    expect(planIndex).toBeGreaterThanOrEqual(0);
    expect(spontaneityIndex).toBeGreaterThan(planIndex);
    expect(server).toContain('dynamicState: kdm.nextDynamicState');
    expect(server).toContain('history: cleanHistory');
  });

  it('composes the lower-authority spontaneity instruction into the existing response-plan prompt instruction', async () => {
    const server = await readFile('server.ts', 'utf8');
    const responseInstructionIndex = server.indexOf('kairaResponsePlanInstruction(responsePlan)');
    const spontaneityInstructionIndex = server.indexOf('kairaControlledSpontaneityInstruction(spontaneityDecision, responsePlan)');

    expect(responseInstructionIndex).toBeGreaterThanOrEqual(0);
    expect(spontaneityInstructionIndex).toBeGreaterThan(responseInstructionIndex);
    expect(server).toContain('responsePlanInstruction = [');
  });

  it('persists the full decision in AI KNT metadata', async () => {
    const server = await readFile('server.ts', 'utf8');
    expect(server).toContain('controlledSpontaneity: spontaneityDecision');
  });

  it('does not silently apply AI spontaneity to the local-language short circuit', async () => {
    const server = await readFile('server.ts', 'utf8');
    expect(server).toContain('reason: "local_language_short_circuit"');
    expect(server).toContain('controlledSpontaneity: { mode: "none", eligible: false, probability: 0, roll: 0');
  });
});
