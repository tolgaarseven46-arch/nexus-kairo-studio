import { describe, expect, it } from 'vitest';
import { isTurkishQuestionAct } from './kairaQuestionActRecognizer';

describe('fresh real-chat Turkish question regression', () => {
  it('catches the kimle production escape', () => {
    expect(isTurkishQuestionAct('kimle oynuyorlar şu an')).toBe(true);
  });

  it('catches the subject + ne production escape', () => {
    expect(isTurkishQuestionAct('skor ne şu an')).toBe(true);
  });

  it('preserves reported-question declaratives', () => {
    expect(isTurkishQuestionAct('skor ne durumda diye anlattı')).toBe(false);
    expect(isTurkishQuestionAct('kimle oynadığını anlattı')).toBe(false);
  });
});
