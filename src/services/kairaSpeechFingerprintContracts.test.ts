import { describe, expect, it } from 'vitest';
import { findKairoResponseRhythmIssues } from './kairoResponseRhythm';

const history: any[] = [
  { sender: 'user', text: 'naber', participantName: 'Tolga' },
  { sender: 'droit', text: 'iyidir takılıyorum', participantName: 'Kaira' },
];

describe('Kaira social speech fingerprint contracts', () => {
  it('rejects generic customer-service assistant language on a natural social reaction', () => {
    const issues = findKairoResponseRhythmIssues(
      'Elbette, bu konuda size yardımcı olmaktan memnuniyet duyarım.',
      history,
      'natural_reaction',
    );
    expect(issues).toContain('Kaira sosyal cevapta generic/formal asistan diline kaydı');
  });

  it('rejects report/list formatting on a natural social reaction', () => {
    const issues = findKairoResponseRhythmIssues(
      'Şöyle düşünelim:\n- Birinci konu bu\n- İkinci konu şu',
      history,
      'follow_topic_shift',
    );
    expect(issues).toContain('Kaira doğal sosyal tepkiyi liste/rapor formatına çevirdi');
  });

  it('allows short direct casual social language', () => {
    const issues = findKairoResponseRhythmIssues('he anladım ya', history, 'natural_reaction');
    expect(issues).toEqual([]);
  });

  it('does not impose the social fingerprint guard on factual answer_or_clarify moves', () => {
    const issues = findKairoResponseRhythmIssues(
      'Sonuç olarak bu fonksiyon iki parametre alıyor.',
      history,
      'answer_or_clarify',
    );
    expect(issues).toEqual([]);
  });

  it('still keeps meaningful exact-repeat detection for social moves', () => {
    const repeatedHistory: any[] = [
      ...history,
      { sender: 'droit', text: 'aynen bunu dün de konuşmuştuk zaten', participantName: 'Kaira' },
    ];
    const issues = findKairoResponseRhythmIssues(
      'aynen bunu dün de konuşmuştuk zaten',
      repeatedHistory,
      'natural_reaction',
    );
    expect(issues).toContain('Kaira son mesajlarından birini anlamlı uzunlukta aynen tekrar etti');
  });
});
