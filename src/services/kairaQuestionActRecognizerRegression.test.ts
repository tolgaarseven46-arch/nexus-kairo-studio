import { describe, expect, it } from 'vitest';
import { isTurkishQuestionAct } from './kairaQuestionActRecognizer';

describe('fresh real-chat Turkish question regression', () => {
  it.each([
    'kimle oynuyorlar şu an',
    'skor ne şu an',
    'oh mis hangi maçı açtın',
    'ooo derbiye yakın maç 😄 kim önde şu an, oyun nasıl',
    'tamam boşverelim maçı 😄 ne yapasın var, aklında başka ne var şimdi',
    'aha derbi modunda 😂 skoru yaz bakalım kim önde',
    'ooo kritik maç 😂 içinden kim geçsin istiyon',
  ])('catches production question escape: %s', (reply) => {
    expect(isTurkishQuestionAct(reply)).toBe(true);
  });

  it('preserves reported-question declaratives', () => {
    expect(isTurkishQuestionAct('skor ne durumda diye anlattı')).toBe(false);
    expect(isTurkishQuestionAct('kimle oynadığını anlattı')).toBe(false);
    expect(isTurkishQuestionAct('hangi maçı açtığını anlattı')).toBe(false);
    expect(isTurkishQuestionAct('kim önde diye anlattı')).toBe(false);
    expect(isTurkishQuestionAct('Mert bana nasılsın diye sordu')).toBe(false);
    expect(isTurkishQuestionAct('Mert iyi misin diye sordu')).toBe(false);
  });
});
