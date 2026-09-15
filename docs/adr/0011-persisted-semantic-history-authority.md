# ADR-0011: Persisted semantic history is the only historical semantic authority

- **Durum:** Accepted
- **Tarih:** 2026-09-15
- **Karar veren:** Tolga / CODEOWNERS
- **İlgili PR:** #274

## Bağlam

`ConversationTurn` geçmiş turlar için `SemanticInterpretation@2` snapshot'ını zaten taşırken `kairaControlledSpontaneity.ts` geçmiş `turn.text` değerlerini yeniden `interpretSemanticEvent(...)` ile yorumluyordu. Bu, current-turn canonical semantic authority ile historical consumers arasında ikinci bir semantik yorum yolu oluşturuyordu ve aynı geçmiş turun farklı katmanlarda farklı anlamlandırılabilmesine izin veriyordu.

Alternatifler yeni bir spontaneity classifier eklemek veya historical raw-text parser'ı korumaktı. İkisi de canonical authority sınırını zayıflatacağı için reddedildi.

## Karar

Historical semantic consumers, mevcut persisted `ConversationTurn.semanticInterpretation` snapshot'ını deterministic `projectSemanticEvent(...)` ile projekte eder; snapshot yoksa raw text'i yeniden parse etmek yerine fail-closed davranır.

## Sonuçlar

- Olumlu: current-turn ve historical semantic truth aynı canonical `SemanticInterpretation@2` authority zincirinde kalır.
- Olumlu: controlled spontaneity artık historical raw text için ayrı parser/classifier çalıştırmaz.
- Olumlu: legacy/missing semantic snapshot yeni semantik gerçek üretmek yerine güvenli biçimde candidate dışı kalır.
- Takas: eski persisted turn'lerde `semanticInterpretation` yoksa spontaneity o turn'i kullanmaz; migration olmadan geriye dönük topic recovery azalabilir.
- Etkilenen seam: `kairaControlledSpontaneity.ts`, `semanticInterpretationProjection.ts`, `ConversationTurn.semanticInterpretation`, canonical historical semantic authority contracts.

## Kanıt

- Characterization RED: commit `674e7be408b83a3f6b2bd019938929b8fe0ad9cd`, CI run `35000930568`; Architecture contracts beklenen historical reparse assertion'ında kırıldı.
- Minimal production fix: commit `c59b57cade6d1726b2f0481b210daf16fb63d6b1`; Architecture contracts, autonomous runtime, beta runtime regression, Phase-0 deterministic harness/report, KNT replay ve adversarial/complex acceptance adımları GREEN ilerledi.

## Notlar

Bu ADR yeni bir semantic authority oluşturmaz. Yalnızca mevcut canonical `SemanticInterpretation@2` snapshot'ının historical consumers tarafından nasıl tüketileceğini sabitler.