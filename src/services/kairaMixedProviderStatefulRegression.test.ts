import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
import type { DroitDynamicState } from '../types/nexus';

const turns = [
  'selam kaira',
  'naber',
  'ben öğrenciyim',
  'bugün iş çok yoğundu',
  'teşekkürler',
  'Mert yarın istifa edecek',
  'tamam',
  'hiç havamda değilim',
  'bana bununla ilgili tavsiye ver',
  'görüşürüz',
  'salak mısın ya',
  'kusura bakma',
] as const;

function runKdmOnly() {
  let state: DroitDynamicState | undefined;
  const snapshots: string[] = [];
  for (const message of turns) {
    const result = analyzeKdmInteraction(message, undefined, state);
    state = result.nextDynamicState;
    snapshots.push(JSON.stringify(state));
  }
  return snapshots;
}

function runWithRouteInspection() {
  let state: DroitDynamicState | undefined;
  const snapshots: string[] = [];
  const routes: Array<'local_language' | 'ai'> = [];

  for (const message of turns) {
    const result = analyzeKdmInteraction(message, undefined, state);
    state = result.nextDynamicState;
    const local = tryLocalKairoReply(
      message,
      {} as any,
      state,
      result.trace,
      'mixed-provider-stateful-regression',
      undefined,
      undefined,
      undefined,
      false,
    );
    routes.push(local.handled ? 'local_language' : 'ai');
    snapshots.push(JSON.stringify(state));
  }

  return { snapshots, routes };
}

describe('mixed local / AI stateful continuity', () => {
  it('keeps KDM state byte-equivalent when response routing is inspected every turn', () => {
    const baseline = runKdmOnly();
    const mixed = runWithRouteInspection();

    expect(mixed.snapshots).toEqual(baseline);
    expect(mixed.routes).toContain('local_language');
    expect(mixed.routes).toContain('ai');
  });

  it('routes simple social routines locally while richer semantic turns stay on the AI path', () => {
    const { routes } = runWithRouteInspection();
    const byMessage = new Map(turns.map((message, index) => [message, routes[index]]));

    expect(byMessage.get('selam kaira')).toBe('local_language');
    expect(byMessage.get('naber')).toBe('local_language');
    expect(byMessage.get('teşekkürler')).toBe('local_language');
    expect(byMessage.get('görüşürüz')).toBe('local_language');

    expect(byMessage.get('ben öğrenciyim')).toBe('ai');
    expect(byMessage.get('Mert yarın istifa edecek')).toBe('ai');
    expect(byMessage.get('bana bununla ilgili tavsiye ver')).toBe('ai');
    expect(byMessage.get('salak mısın ya')).toBe('ai');
  });
});
