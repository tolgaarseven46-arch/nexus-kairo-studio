import { describe, expect, it } from 'vitest';
import { isTurkishQuestionAct } from './kairaQuestionActRecognizer';

describe('isTurkishQuestionAct', () => {
  it.each([
    'kimle oynuyorlar şu an',
    'skor ne şu an',
    'skor ne durumda şimdi',
    'neyden bu kadar gerildin böyle',
    'ne zaman başlıyor',
    'ne kadar sürüyor',
    'hangi maç ya',
    'güzel, hangi maç ya',
    'iyi misin',
    'geliyor musun',
    'oh mis hangi maçı açtın',
    'ooo derbiye yakın maç 😄 kim önde şu an, oyun nasıl',
    'tamam boşverelim maçı 😄 ne yapasın var, aklında başka ne var şimdi',
    'aha derbi modunda 😂 skoru yaz bakalım kim önde',
    'ooo kritik maç 😂 içinden kim geçsin istiyon',
  ])('detects punctuationless Turkish question act: %s', (text) => {
    expect(isTurkishQuestionAct(text)).toBe(true);
  });

  it.each([
    'skor ne durumda diye anlattı',
    'kimle oynadığını anlattı',
    'hangi maç olduğunu söyledi',
    'hangi maçı açtığını anlattı',
    'kim önde diye anlattı',
    'ne yapasın var diye sordu',
    'Mert bana nasılsın diye sordu',
    'Mert iyi misin diye sordu',
    'ne güzel maç',
    'skor bugün iki bir',
    '[bence] bu kadar yeter',
  ])('does not misclassify reported/declarative text: %s', (text) => {
    expect(isTurkishQuestionAct(text)).toBe(false);
  });
});
