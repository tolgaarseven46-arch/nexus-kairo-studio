# ADR-0012: Conversation turn semantic truth is immutable and single-source

- **Durum:** Accepted
- **Tarih:** 2026-09-03
- **Karar veren:** Tolga / ChatGPT, Claude red-team evidence review
- **İlgili PR:** #35

## Bağlam

PR #34 sonrasında yapılan ilk sekiz turluk normal konuşma testi, yapısal olarak yeşil CI'a rağmen temel conversation sorunları üretti. Patch önermek yerine önceden sabitlenmiş bir ablation ölçümü yapıldı.

Aynı sekiz user turn için ingestion-time LLM semantic okuması ile historical replay'de kullanılan regex `interpretSemanticEvent(text)` okuması karşılaştırıldı. Davranış kararını etkileyen intent/social-act, target, valence/emotional sınıfı veya relationship severity farkı "materyal" kabul edildi. Yeniden tasarım eşiği ölçümden önce yaklaşık %10–15 olarak sabitlendi.

Sonuç: sekiz turun yedisinde (%87.5) materyal semantic fark bulundu. Current-turn ve historical-turn için iki farklı parser kullanılması aynı conversation içinde farklı semantic gerçekler üreten bir authority hatasıdır.

İlk C1a uygulamasında ingestion snapshot boru hattı doğru kurulmuş olsa da canonical payload geçici olarak `SemanticEvent` seçilmişti. Repo-forensic inceleme ADR-0006 ile bunun çeliştiğini gösterdi: kabul edilmiş canonical compositional şema `SemanticInterpretation@2` idi; buna karşın gerçek LLM producer `SemanticEvent` üretiyor ve KDM `interpretationFromLegacyEvent` ile eksik v2 alanlarını raw text üzerinde yeniden türetiyordu.

Bu nedenle C1 iki bağımsız fakat aynı authority ailesindeki adım olarak tamamlandı:

- **C1a:** ingestion-time canonical v2 snapshot'ın live/history/persistence/hydration boyunca tek semantic truth olarak taşınması; historical raw-text reparse'ın kaldırılması.
- **C1b:** KDM/RelationshipReducer authoritative hattının `SemanticInterpretation@2`'yi doğrudan tüketmesi; `interpretationFromLegacyEvent` ve raw-text enrichment'ın authoritative relationship yolundan kaldırılması.

Classification→policy coupling (C2) ayrı bir yapısal problemdir ve bu ADR/PR kapsamında çözülmez.

## Karar

Bir user turn'ün canonical semantic truth'u **`SemanticInterpretation@2`**'dir. Bu obje ingestion anında tam olarak bir kez üretilir, immutable turn snapshot'ı olarak taşınır/persist edilir ve bütün downstream/historical tüketiciler aynı objeyi veya ondan deterministik türetilen projection'ları kullanır.

`SemanticEvent` canonical authority değildir. Yalnız `SemanticInterpretation@2`'den deterministik olarak türetilen compatibility/appraisal projection'dır. Projection raw text'i inceleyemez, parser/regex çağıramaz ve semantic okumayı genişletemez.

### Authority kuralları

1. **Gerçek producer:** normal language-understanding yolu LLM semantic provider → `SemanticInterpretation@2` üretir. Eksik/invalid v2 output canonical kabul edilmez; provider failure sayılır ve explicit fallback'e geçilir.
2. **Fallback:** regex yalnız ingestion-time `fallback_regex` producer olarak aynı v2 şemayı üretebilir. Historical veya downstream reparse rolü yoktur.
3. **Discourse facet ownership:** `socialRoutine`, `discourseAct`, `repairSignal`, `knowledgeQuery`, `selfMemoryQuery`, relational facet'ler, `stopQuestions`, `stopTalking` ve advice sinyalleri v2 `discourseFacets` altında yaşar.
4. **Historical authority:** historical user turn'ler yalnız persisted `SemanticInterpretation@2` snapshot'ını tüketir. Snapshot yoksa semantic replay fail-closed olur; runtime raw text'i yeniden yorumlamaz.
5. **Transport/persistence:** live Studio history, client→server payload, server result, layer audit, test-session persistence ve hydration aynı `semanticInterpretation` snapshot'ını korur.
6. **KDM authority:** production server yalnız `analyzeKdmInteractionCanonicalTurn(...)` kullanır ve aynı ingestion sonucunun `canonicalSemantic.interpretation` + deterministik grounded `canonicalSemantic.event` projection'ını verir.
7. **RelationshipReducer input:** severity vector, joking/sincerity confidence, uncertainty, target, repair/apology/support vb. semantic sinyaller doğrudan v2'den gelir. Bridge raw text parse etmez ve `interpretationFromLegacyEvent` kullanmaz.
8. **Entity/world grounding:** `relationshipScope` language-understanding boundary'de entity/world grounding'den deterministik üretilir. KDM bunu yalnız tüketir; yeniden entity çözümlemez. Third-party scope dyadic Kaira-user damage/reward/repair sinyallerini relationship reducer'a taşımaz.
9. **Stop ayrımı:** canonical `stopRequest` yalnız full-conversation stop anlamına gelir ve `discourseFacets.stopTalking` ile birebir aynıdır. `stopQuestions` ayrı bir discourse facet'tir ve tek başına relationship FSM'i disengage yapamaz.
10. **Migration-negative proof:** bir migration "X, Y'nin yerini aldı" dediğinde eski authority yolunun normal runtime'da yokluğu negatif contract ile zorunlu doğrulanır.
11. **Policy ayrımı:** `complaint/confusion` gibi content etiketlerinin `repair_or_rephrase` gibi policy kararlarına nasıl modüle edildiği C2'dir; C1 bunu çözmüş sayılmaz.

## Sonuçlar

- Current turn ve history aynı immutable compositional semantic truth'u kullanır; Ablation-0'daki parser-divergence sınıfı yapısal olarak kapanır.
- RelationshipReducer'ın ihtiyaç duyduğu severity/joking/sincerity/uncertainty alanları gizli downstream regex reconstruction yerine gerçek producer kontratının parçasıdır.
- `SemanticEvent` yaşamaya devam eder fakat authority değil deterministik compatibility/appraisal projection rolündedir; üçüncü semantic representation eklenmez.
- Third-party entity/world grounding korunur fakat semantic authority yaratmaz.
- `stopQuestions` ile full stop artık canonical v2'de ayrı anlamlardır.
- C1 öncesi persisted turn'lerde v2 snapshot yoksa runtime onları sessizce yeniden yorumlamaz; gerekiyorsa ayrı batch migration gerekir.
- Kapsam dışı: C2 classification→policy coupling, repetition guard ve emotionalLoad policy/threshold kalibrasyonu.

## Etkilenen seam'ler

- `src/types/semanticInterpretation.ts`
- `src/services/llmSemanticUnderstandingProvider.ts`
- `src/services/semanticInterpretationSchema.ts`
- `src/services/semanticInterpretationProjection.ts`
- `src/services/semanticInterpretationLegacyProjection.ts` (yalnız explicit regex fallback/test ingress rolü)
- `src/services/languageUnderstandingService.ts`
- `src/services/serverLanguageUnderstanding.ts`
- `src/services/kdmConsistencyEngine.ts`
- `src/services/kdmRelationshipReducerBridge.ts`
- `server.ts`
- `TestMessage` / `ConversationTurn`
- `droitChatService` history payload
- Studio live history
- test-session persistence/hydration
- `deriveDiscourseState`

## Doğrulama

- Pre-change ablation: **7/8 (%87.5)** material current-LLM vs historical-regex semantic divergence.
- C1a ilk snapshot boru hattı bağımsız full CI + TypeScript + production build geçti; sonrasında canonical payload ADR-0006 ile uyumlu v2'ye yükseltildi.
- V2 producer/snapshot focused migration: **66/66 test + TypeScript** geçti.
- C1a exact v2 head: PR-wide **CI + Architecture Review success**.
- C1b authoritative KDM migration sırasında full suite gerçek third-party relationship-scope regresyonunu yakaladı; fix upstream grounded `relationshipScope` tüketimine taşındı ve ilgili property/state contracts tekrar yeşil oldu.
- C1b ayrıca `stopQuestions` ile full stop'un v2 `stopRequest` alanında yanlış birleştirildiğini ortaya çıkardı; producer/schema sözleşmesi `stopRequest === stopTalking` olarak sıkılaştırıldı.
- C1b exact validation head `5e90c3e...`: Architecture contracts, autonomous runtime, beta gate, beta conversation acceptance, full test suite, TypeScript ve production build **success**; Architecture Review **success**.
- Negatif authority contracts şunları kilitler:
  - normal gateway eski incoming `SemanticEvent` authority'sini kabul etmez;
  - v2→Event projection parser/regex/raw-text reinterpretation yapmaz;
  - production server legacy KDM helper'ını çağırmaz;
  - authoritative relationship bridge `interpretationFromLegacyEvent` veya raw-text parser kullanmaz;
  - question-stop/full-stop semantic ayrımı yeniden birleşemez.

## Notlar

C1 bu ADR ile tamamlanmıştır. Sonraki yapısal çalışma **C2: classification/content semantic → dialogue policy coupling** olmalıdır ve ayrı PR/branch'te yürütülmelidir; C1 ile aynı causal change olarak karıştırılmamalıdır.
