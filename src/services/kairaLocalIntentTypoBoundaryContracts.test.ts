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

describe('local renderer no longer classifies intent (ADR-0006 foundation repair)', () => {
  // The local renderer intent now comes ONLY from the shared SemanticEvent's
  // routine. It never re-parses the message or invents a routine from a
  // normalizer canonical form. When the shared event has no routine (typo the
  // understanding layer did not resolve), the renderer defers to the pipeline.
  it.each(positives)('local render follows the shared event routine for %s (%s)', (message, intent) => {
    const sharedRoutine = interpretSemanticEvent(message).socialRoutine ?? 'none';
    const result = resolve(message);
    if (sharedRoutine !== 'none') {
      expect(result.handled).toBe(true);
      expect(result.intent).toBe(intent);
      expect(result.source).toBe('local_language');
    } else {
      // Typo the understanding layer did not resolve -> defer to the pipeline.
      expect(result.handled).toBe(false);
      expect(result.source).toBe('ai');
    }
  });

  it.each(negatives)('also defers a routine-shaped message that carries richer semantics: %s', (message) => {
    const result = resolve(message);
    expect(result.handled).toBe(false);
    expect(result.source).toBe('ai');
  });

  it('renders when the shared event already carries the routine (no re-parse needed)', () => {
    const result = tryLocalKairoReply(
      'selam',
      personality,
      state,
      trace,
      'typo-boundary-shared-routine',
      'complete_social_routine',
      undefined,
      interpretSemanticEvent('selam'),
    );
    expect(result.handled).toBe(true);
    expect(result.intent).toBe('greeting');
    expect(result.source).toBe('local_language');
  });
});
