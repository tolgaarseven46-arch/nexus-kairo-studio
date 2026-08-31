import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { tryLocalKairoReply, type LocalIntent } from './kairoLocalLanguageEngine';
import { interpretSemanticEvent } from './semanticEventEngine';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';

const cases: Array<[string, LocalIntent]> = [
  ['günaydın', 'greeting'],
  ['selamlar', 'greeting'],
  ['nasıl gidiyor', 'how_are_you'],
  ['ne var ne yok', 'how_are_you'],
  ['keyifler nasıl', 'how_are_you'],
  ['napıyosun', 'what_doing'],
  ['napiyosun', 'what_doing'],
  ['saol', 'thanks'],
  ['eyw', 'thanks'],
  ['tamamdır', 'agreement'],
  ['olur', 'agreement'],
  ['görüşmek üzere', 'goodbye'],
  ['kaçarım', 'goodbye'],
  ['geceler', 'good_night'],
  ['iyi uykular', 'good_night'],
  ['moral yok', 'emotional_opening'],
  ['mod düşük', 'emotional_opening'],
  ['enerjim yok', 'emotional_opening'],
  ['içim daraldı', 'emotional_opening'],
];

describe('expanded local Turkish social routines', () => {
  for (const [message, expectedIntent] of cases) {
    it(`handles ${message} locally as ${expectedIntent}`, () => {
      const semanticEvent = interpretSemanticEvent(message);
      const kdm = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, undefined, semanticEvent);
      const local = tryLocalKairoReply(
        message,
        NEUTRAL_DROIT_PERSONALITY,
        kdm.nextDynamicState,
        kdm.trace,
        'routine_test',
        undefined,
        undefined,
        semanticEvent,
        false,
      );
      expect(local.handled).toBe(true);
      expect(local.intent).toBe(expectedIntent);
      expect(local.source).toBe('local_language');
    });
  }

  for (const message of ['Mert yarın ne yapacaktı', 'soru sorma artık', 'ne yapmalıyım', 'özür dilerim', 'salak']) {
    it(`does not swallow richer semantic message: ${message}`, () => {
      const semanticEvent = interpretSemanticEvent(message);
      const kdm = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, undefined, semanticEvent);
      const local = tryLocalKairoReply(
        message,
        NEUTRAL_DROIT_PERSONALITY,
        kdm.nextDynamicState,
        kdm.trace,
        'routine_test',
        undefined,
        undefined,
        semanticEvent,
        false,
      );
      expect(local.handled).toBe(false);
      expect(local.source).toBe('ai');
    });
  }
});
