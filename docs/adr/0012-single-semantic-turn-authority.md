# ADR-0012: Conversation turn semantic truth is immutable and single-source

- **Durum:** Proposed
- **Tarih:** 2026-09-03
- **Karar veren:** Tolga / ChatGPT, Claude red-team evidence review
- **İlgili PR:** #35

## Bağlam

PR #34 sonrasında yapılan ilk sekiz turluk normal konuşma testi, yapısal olarak yeşil CI'a rağmen temel conversation sorunları üretti. Patch önermek yerine önceden sabitlenmiş bir ablation ölçümü yapıldı.

Aynı sekiz user turn için ingestion-time LLM semantic okuması ile historical replay'de kullanılan regex `interpretSemanticEvent(text)` okuması karşılaştırıldı. Davranış kararını etkileyen intent/social-act, target, valence/emotional sınıfı veya relationship severity farkı "materyal" kabul edildi. Yeniden tasarım eşiği ölçümden önce yaklaşık %10–15 olarak sabitlendi.

Sonuç: sekiz turun yedisinde (%87.5) materyal semantic fark bulundu. Current-turn ve historical-turn için iki farklı parser kullanılması aynı conversation içinde farklı semantic gerçekler üreten bir authority hatasıdır.

C1a'nın ilk uygulamasında ingestion snapshot boru hattı doğru kurulmuş olsa da canonical payload yanlışlıkla legacy `SemanticEvent` olarak seçildi. Sonraki repo-forensic inceleme Accepted ADR-0006 ile bu seçimin çeliştiğini gösterdi: ADR-0006 canonical compositional şemayı `SemanticInterpretation@2` (`primaryIntent`, `secondarySocialActs[]`, target, severity vector, joking/sincerity confidence, uncertainty, evidence) olarak kabul etmişti; buna karşın gerçek LLM producer hâlâ `SemanticEvent` üretiyor ve KDM `interpretationFromLegacyEvent` ile eksik v2 alanlarını raw text üzerinde yeniden türetiyordu.

Bu nedenle bulgu yalnız historical dual-authority değil, **tamamlanmamış canonical semantic migration** olarak genişletildi. C1b ve classification→policy C2 hâlâ ayrı problemlerdir ve bu ADR kapsamında çözülmez.

## Karar

Bir user turn'ün canonical semantic truth'u **`SemanticInterpretation@2`**'dir. Bu obje ingestion anında tam olarak bir kez üretilir, turn ile immutable snapshot olarak taşınır/persist edilir ve bütün historical replay yalnız bu snapshot'ı tüketir.

`SemanticEvent` canonical authority değildir. Yalnız `SemanticInterpretation@2`'den deterministik olarak türetilen compatibility/appraisal projection'dır. Projection raw text'i inceleyemez, parser/regex çağıramaz ve semantic okuma genişletemez.

Ek kurallar:

1. **Gerçek producer:** normal language-understanding yolu LLM semantic provider → `SemanticInterpretation@2` üretir. Provider eksik/invalid v2 döndürürse eksik alanlar defaultlarla "canonical" yapılmaz; çağrı başarısız kabul edilir ve açık fallback yoluna geçilir.
2. **Fallback:** regex yalnız parser/provider failure anında `fallback_regex` source'u ile aynı `SemanticInterpretation@2` şemasını üreten ingestion-time producer olabilir. Historical veya downstream reparse rolü yoktur.
3. **Discourse facet ownership:** `socialRoutine`, `discourseAct`, `repairSignal`, `knowledgeQuery`, `selfMemoryQuery`, relational facet'ler ve stop/advice sinyalleri canonical v2 objenin `discourseFacets` alanında yaşar. Projection'ın özel bilgisi değildir.
4. **Historical authority:** `deriveDiscourseState` historical user text için regex/LLM çağrısı yapamaz; yalnız persisted `SemanticInterpretation@2` snapshot'ını deterministik `SemanticEvent` projection'a çevirip mevcut discourse reducer'a verir.
5. **Transport/persistence:** Live Studio history, client→server history payload, server result, layer audit, test-session persistence ve hydration aynı turn'e ait canonical `semanticInterpretation` snapshot'ını korur.
6. **Fail-closed:** Eski/persist edilmemiş historical turn'de canonical v2 snapshot yoksa discourse semantic replay fail-closed olur; runtime sessizce yeni semantic truth üretmez. Gerekirse ayrı ve açık batch migration yapılır.
7. **Policy ayrımı:** `complaint/confusion` gibi content etiketlerinin `repair_or_rephrase` gibi dialogue policy kararlarına nasıl modüle edildiği C2'dir; bu değişiklik classification→policy coupling'i çözmeye çalışmaz.
8. **Migration-negative proof:** Bir ADR/migration "X, Y'nin yerini aldı" dediğinde yalnız yeni yolun varlığı değil, eski authority yolunun artık normal runtime'da kabul edilmediği de negatif contract/lint testiyle doğrulanır.

## Sonuçlar

- Olumlu: current turn ve history aynı immutable compositional semantic truth'u kullanır; Ablation-0 parser divergence yapısal olarak kapanır.
- Olumlu: RelationshipReducer'ın ihtiyaç duyduğu severity vector / joking / sincerity / uncertainty artık gizli downstream regex reconstruction'a bağlı olmadan gerçek producer kontratının parçasıdır.
- Olumlu: `SemanticEvent` yaşamaya devam eder fakat authority değil deterministik compatibility projection rolüne düşer; üçüncü semantic representation eklenmez.
- Olumlu: Gelecekte historical raw-text reparse veya eski incoming `SemanticEvent` authority'si geri eklenirse negatif authority contract kırılır.
- Olumsuz / takas: C1a öncesi persisted turn'lerde v2 snapshot yoktur; bunlar runtime'da yeniden yorumlanmaz.
- Olumsuz / takas: LLM parser prompt/schema artık daha zengindir; severity/joking/sincerity/uncertainty alanlarının operasyonel semantiği promptta açık çıpalarla korunmalı ve telemetry/fixtures ile kalibre edilmelidir.
- Kapsam dışı: repair-policy coupling (C2), repetition, emotionalLoad policy/threshold kalibrasyonu.

## Etkilenen seam'ler

- `src/types/semanticInterpretation.ts`
- `src/services/llmSemanticUnderstandingProvider.ts`
- `src/services/languageUnderstandingService.ts`
- `src/services/semanticInterpretationProjection.ts`
- `src/services/serverLanguageUnderstanding.ts`
- `server.ts`
- `TestMessage` / `ConversationTurn`
- `droitChatService` history payload
- Studio live history
- test-session persistence/hydration
- `deriveDiscourseState`

## Doğrulama

- Pre-change ablation: 7/8 (%87.5) material semantic divergence.
- İlk C1a Event-snapshot altyapısı bağımsız olarak full CI + TS + production build geçti; boru hattının kendisi doğrulandı fakat canonical type sonradan ADR-0006 ile uyumlu hale getirildi.
- V2 producer/snapshot focused migration validation: 10 dosyada 66/66 test geçti.
- Aynı focused migration'da TypeScript `--noEmit` geçti.
- Negatif authority contract doğruluyor:
  - normal language gateway `incomingSemanticEvent` kabul etmiyor;
  - v2→Event projection parser/regex import veya çağrısı içermiyor;
  - projection raw wording değişince semantic sınıfı yeniden çıkarmıyor.
- PR-wide CI, Architecture Review ve production build merge öncesi ayrıca zorunludur.

## Notlar

C1b'ye geçiş ön koşulu: düzeltilmiş v2 snapshot tipi + gerçek v2 LLM producer aynı PR head'inde PR-wide CI ile doğrulanmış olmalıdır. C2 bundan sonra ayrı değişiklik olarak ele alınır.
