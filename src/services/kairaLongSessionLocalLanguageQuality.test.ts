import { describe, expect, it, vi } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
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

      messages.forEach((message, index) => {
        const kdm = analyzeKdmInteraction(message, personality, state);
        state = kdm.nextDynamicState;
        const local = tryLocalKairoReply(
          message,
          personality,
          state,
          kdm.trace,
          'long_session_local_quality_user',
        );

        expect(local.handled).toBe(true);
        expect(local.source).toBe('local_language');
        expect(local.reply).toBeTruthy();

        const reply = String(local.reply);
        const wordCount = reply.trim().split(/\s+/u).filter(Boolean).length;
        expect(wordCount).toBeLessThanOrEqual(8);
        expect(findKairoResponseRhythmIssues(reply, history, 'natural_reaction')).toEqual([]);

        replies.push(reply);
        history.push({ sender: 'user', text: message, participantName: 'Tolga' } as ConversationTurn);
        history.push({ sender: 'droit', text: reply, participantName: 'Kaira' } as ConversationTurn);

        if (index > 0) {
          expect(reply.length).toBeGreaterThan(0);
        }
      });

      expect(replies).toHaveLength(20);
      expect(new Set(replies).size).toBeGreaterThanOrEqual(7);
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
