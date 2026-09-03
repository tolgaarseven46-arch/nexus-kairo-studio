import { describe, expect, it, vi } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';
import { deriveDiscourseState } from './discourseStateReducer';
import { interpretSemanticEvent } from './semanticEventEngine';
import { findKairoResponseRhythmIssues } from './kairoResponseRhythm';
import { normalizeDroitPersonality } from './droitPersonalityNormalizer';
import type { ConversationTurn } from './kairoConversationGrounding';
import type { DroitDynamicState } from '../types/nexus';

const messages = [
  'selam', 'naber', 'napıyon', 'eyvallah', 'aynen',
  'selam yine', 'nasılsın', 'ne yapıyorsun', 'sağ ol', 'tamam',
  'selam', 'naber', 'napıyon', 'teşekkürler', 'aynen',
  'iyi geceler', 'selam', 'nasılsın', 'ne yapıyorsun', 'görüşürüz',
];

describe('long-session local-language quality', () => {
  it('keeps a 20-turn social session short, local, varied and free of assistant drift', () => {
    vi.useFakeTimers();
    try {
      const personality = normalizeDroitPersonality({ humor: 75, communication: 75 });
      let state: DroitDynamicState | undefined;
      const history: ConversationTurn[] = [];
      const replies: string[] = [];

      let localCount = 0;
      messages.forEach((message) => {
        const kdm = analyzeKdmInteraction(message, personality, state);
        state = kdm.nextDynamicState;
        const event = interpretSemanticEvent(message);
        const discourse = deriveDiscourseState(history, { message, event });
        const dialogue = planDialogueResponse(history, message, 'Tolga', event, undefined, discourse);
        const local = tryLocalKairoReply(
          message,
          personality,
          state,
          kdm.trace,
          'long_session_local_quality_user',
          dialogue.move,
          undefined,
          event,
          true,
          discourse,
        );

        // A trivial non-saturated routine renders locally; a saturated repeat is
        // deferred to the main pipeline (correct — no blind greeting loop).
        let reply: string;
        if (local.handled) {
          localCount += 1;
          expect(local.source).toBe('local_language');
          expect(local.reply).toBeTruthy();
          reply = String(local.reply);
          const wordCount = reply.trim().split(/\s+/u).filter(Boolean).length;
          expect(wordCount).toBeLessThanOrEqual(8);
          expect(findKairoResponseRhythmIssues(reply, history, 'natural_reaction')).toEqual([]);
          replies.push(reply);
        } else {
          reply = `[pipeline] ${message}`;
        }

        history.push({ sender: 'user', text: message, participantName: 'Tolga' } as ConversationTurn);
        history.push({ sender: 'droit', text: reply, participantName: 'Kaira' } as ConversationTurn);
      });

      // Most trivial turns still short-circuit locally; the session stays varied.
      expect(localCount).toBeGreaterThanOrEqual(8);
      expect(new Set(replies).size).toBeGreaterThanOrEqual(5);
      const frequencies = replies.reduce<Record<string, number>>((acc, reply) => {
        acc[reply] = (acc[reply] ?? 0) + 1;
        return acc;
      }, {});
      expect(Math.max(...Object.values(frequencies))).toBeLessThanOrEqual(4);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
