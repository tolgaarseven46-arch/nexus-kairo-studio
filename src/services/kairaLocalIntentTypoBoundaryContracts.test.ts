import { describe, expect, it } from 'vitest';
import { tryLocalKairoReply, type LocalIntent } from './kairoLocalLanguageEngine';
import { interpretSemanticEvent } from './semanticEventEngine';

const personality = {
  humor: 60,
} as any;

const state = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin',
  reactionMode: 'neutral',
  relationship: {
    warmth: 60,
    trust: 60,
    hurtScore: 0,
    conflictScore: 0,
    familiarityDays: 5,
    interactionCount: 10,
  },
} as any;

const trace = {
  decision: { chosenTone: 'casual' },
} as any;

function resolve(message: string) {
  return tryLocalKairoReply(
    message,
    personality,
    state,
    trace,
    `typo-boundary-${message}`,
    undefined,
    undefined,
    interpretSemanticEvent(message),
  );
}

const positives: Array<[string, LocalIntent]> = [
  ['slm', 'greeting'],
  ['sa', 'greeting'],
  ['mrb', 'greeting'],
  ['kaira slm', 'greeting'],
  ['slm kanka', 'greeting'],
  ['nbr', 'how_are_you'],
  ['napyon', 'what_doing'],
  ['napıyosun', 'what_doing'],
  ['ne yapıyon', 'what_doing'],
  ['sagol', 'thanks'],
  ['saol', 'thanks'],
  ['tsk', 'thanks'],
  ['tşk', 'thanks'],
  ['tesekkurler', 'thanks'],
  ['gorusuruz', 'goodbye'],
  ['ii geceler', 'good_night'],
  ['geceler', 'good_night'],
];

const negatives = [
  'sağol ama yardım et',
  'slm neden böylesin',
  'mrb saçmalama',
  'napyon da yarın ne yapacaktı',
  'ii geceler ama sus',
  'tsk ama beni affet',
  'slm soru sorma artık',
];

describe('local intent typo and near-neighbor boundaries', () => {
  it.each(positives)('handles canonicalized short routine %s as %s', (message, intent) => {
    const result = resolve(message);
    expect(result.handled).toBe(true);
    expect(result.intent).toBe(intent);
    expect(result.source).toBe('local_language');
    expect(result.normalization?.canonical).not.toBe('');
  });

  it.each(negatives)('does not let canonical fallback swallow richer semantics: %s', (message) => {
    const result = resolve(message);
    expect(result.handled).toBe(false);
    expect(result.source).toBe('ai');
  });
});
