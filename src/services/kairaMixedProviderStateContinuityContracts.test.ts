import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const server = readFileSync('server.ts', 'utf8');
const count = (needle: string) => server.split(needle).length - 1;
const localBranchMarker = 'if (!selfMemoryInstruction && local.handled && local.reply)';

describe('mixed local / AI provider state continuity contracts', () => {
  it('computes canonical KDM state once before the local-vs-AI response branch', () => {
    const kdm = server.indexOf('kdm = analyzeKdmInteraction(');
    const local = server.indexOf('local = tryLocalKairoReply(');
    const branch = server.indexOf(localBranchMarker);

    expect(kdm).toBeGreaterThan(-1);
    expect(local).toBeGreaterThan(kdm);
    expect(branch).toBeGreaterThan(local);
    expect(count('kdm = analyzeKdmInteraction(')).toBe(1);
  });

  it('persists the same canonical nextDynamicState on both local and AI branches', () => {
    expect(count('dynamicState: kdm.nextDynamicState,')).toBeGreaterThanOrEqual(4);
    expect(count('dynamicStateAfter: kdm.nextDynamicState,')).toBeGreaterThanOrEqual(2);
    expect(count('relationshipState:\n            kdm.nextDynamicState.relationship || kdm.trace.relationship,')).toBeGreaterThanOrEqual(1);
    expect(count('relationshipState:\n          kdm.nextDynamicState.relationship || kdm.trace.relationship,')).toBeGreaterThanOrEqual(1);
  });

  it('records canonical effective pre-turn state rather than a default request snapshot', () => {
    expect(count('dynamicStateBefore: effective,')).toBe(2);
    expect(count('dynamicStateBefore: requestState,')).toBe(0);

    const persistedFallback = server.indexOf('effective = dynamicState?.relationship');
    const localBranch = server.indexOf(localBranchMarker);
    expect(persistedFallback).toBeGreaterThan(-1);
    expect(localBranch).toBeGreaterThan(persistedFallback);
  });

  it('records KDM quality metrics on both local and AI response paths', () => {
    expect(count('recordKdmMetric({')).toBe(2);

    const localBranch = server.indexOf(localBranchMarker);
    const aiBranch = server.indexOf('const relationship = kdm.trace.relationship;', localBranch);
    const localWindow = server.slice(localBranch, aiBranch);
    const aiWindow = server.slice(aiBranch);

    expect(localWindow).toContain('recordKdmMetric({');
    expect(localWindow).toContain('score: consistency.score');
    expect(localWindow).toContain('accepted: consistency.accepted');
    expect(localWindow).toContain('repaired: false');
    expect(localWindow).toContain('repairAttempts: 0');
    expect(aiWindow).toContain('recordKdmMetric({');
  });

  it('returns the same canonical state envelope to clients regardless of provider path', () => {
    const localBranch = server.indexOf(localBranchMarker);
    const aiBranch = server.indexOf('const relationship = kdm.trace.relationship;', localBranch);
    const localWindow = server.slice(localBranch, aiBranch);
    const aiWindow = server.slice(aiBranch);

    expect(localWindow).toContain('kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState');
    expect(aiWindow).toContain('kdm: { trace: kdm.trace, dynamicState: kdm.nextDynamicState');
  });

  it('keeps provider identity as observability metadata rather than a state-transition input', () => {
    const kdmCallStart = server.indexOf('kdm = analyzeKdmInteraction(');
    const kdmCallEnd = server.indexOf('),\n      behaviorContract =', kdmCallStart);
    const kdmCall = server.slice(kdmCallStart, kdmCallEnd);

    expect(kdmCall).not.toContain('providerUsed');
    expect(kdmCall).not.toContain('activeAiProviderUsed');
    expect(kdmCall).not.toContain('local_language');
    expect(server).toContain('providerUsed: "local_language"');
    expect(server).toContain('providerUsed: activeAiProviderUsed');
  });
});
