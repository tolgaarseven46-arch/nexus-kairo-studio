import { describe, expect, it } from 'vitest';
import { validateKairoResponse } from './kairoResponseConsistency';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';

const trace = (intent: string, sentiment: string, chosenTone = 'balanced') => ({
  whoSent: { userName: 'Mert', isNewUser: false, recognitionText: 'test' },
  relationship: {
    warmthScore: 52,
    warmthLabel: 'Dengeli',
    note: 'test',
    familiarityDays: 0,
    interactionCount: 3,
    toleranceMultiplier: 1,
    trustScore: 54,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 8,
    repeatedNegativeCount: 0,
    conversationState: 'active',
    repairAttempts: 0,
  },
  currentMood: { moodText: 'Empatik ve dikkatli', reactionMode: 'neutral', reasonText: 'test' },
  messageInterpretation: { intent, sentiment, explanation: 'test' },
  decision: { chosenTone, explanation: 'test' },
  memoryUpdate: { warmthBefore: 52, warmthAfter: 52, warmthDelta: 0, moodChange: 'stabil', reason: 'test' },
}) as any;

describe('beta conversation continuity regressions', () => {
  it('does not treat generic emotional-load greetings as support obligations', () => {
    const result = validateKairoResponse('merhaba', trace('selamlama', 'duygusal_yük'));
    expect(result.issues).not.toContain('Duygusal destek niyetiyle yanıt yeterince destekleyici değil');
  });

  it('accepts the agreed minimal curiosity response for an emotional opening', () => {
    const result = validateKairoResponse('niye ya', trace('duygusal_paylasim', 'duygusal_yük'));
    expect(result.issues).not.toContain('Duygusal destek niyetiyle yanıt yeterince destekleyici değil');
    expect(result.checks.intentTone).toBe(true);
  });

  it('binds tamam to a recent explicit Kaira offer instead of creating a new topic', () => {
    const plan = planDialogueResponse(
      [{ sender: 'droit', text: 'bunları bi dön, sonra istersen biraz daha karışık atarım sana' } as any],
      'tamam',
      'Mert',
    );
    expect(plan).toMatchObject({ move: 'follow_previous_answer', allowFollowUpQuestion: false, allowSpeculation: false });
  });

  it('keeps a second short acknowledgement behind one Kaira ack attached to the same offer', () => {
    const plan = planDialogueResponse(
      [
        { sender: 'droit', text: 'bunları bi dön, sonra istersen biraz daha karışık atarım sana' } as any,
        { sender: 'user', participantName: 'Mert', text: 'tamam' } as any,
        { sender: 'droit', text: 'evet' } as any,
      ],
      'evet',
      'Mert',
    );
    expect(plan).toMatchObject({
      move: 'follow_previous_answer',
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 8,
    });
    expect(plan.reason).toContain('beğeni');
  });

  it('does not bind a standalone evet when there is no recent prompt or offer', () => {
    const plan = planDialogueResponse(
      [{ sender: 'droit', text: 'bugün hava baya sıcak' } as any],
      'evet',
      'Mert',
    );
    expect(plan.move).toBe('natural_reaction');
  });

  it.each(['naber', 'nasılsın kank', 'ne yapıyorsun'])(
    'allows one natural reciprocal question for direct social routine: %s',
    (message) => {
      const plan = planDialogueResponse([], message, 'Mert');
      expect(plan).toMatchObject({
        move: 'natural_reaction',
        allowFollowUpQuestion: true,
        allowSpeculation: false,
      });
    },
  );
});
