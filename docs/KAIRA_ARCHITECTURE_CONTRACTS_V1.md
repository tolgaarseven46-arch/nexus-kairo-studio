# KAIRA Architecture Contracts v1

## Karar

Kaira geliştirmesinde yeni büyük katman eklemeden önce mevcut veri akışı contract/invariant seviyesinde sabitlenecek.

Örnek cümleler sistem tasarımının kendisi değildir. Örnekler regression fixture olarak tutulur; doğruluk ise katman sınırlarındaki genel sözleşmelerle tanımlanır.

**Durum: AKTİF.** CI artık architecture-contract testlerini full test/build zincirinden önce ayrı bir kapı olarak çalıştırır.

## Canonical akış

1. Language Understanding -> `SemanticEvent`
2. Entity Resolution -> `EntityResolutionResult`
3. World Event Mapping -> `CanonicalWorldEvent`
4. World Model Store / Retrieval -> `EvidenceSet` (`RetrievedWorldEvent[]`)
5. Appraisal / Relationship / Temperament -> `DroitDynamicState`
6. Conversation State Authority -> authoritative social state
7. Behavior Policy -> `BehaviorContract`
8. Response Generation -> natural-language realization
9. Deterministic Enforcement / Consistency -> delivered response
10. Contract Audit -> invariant violations

Bir katman downstream katmanın işini üstlenmemeli. Ham kullanıcı cümlesi mümkün olduğunca erken canonical temsile indirgenmeli; downstream motorlar aynı anlamı yeniden bağımsız regex/heuristic ile çözmeye çalışmamalı.

## V1 invariantları

### Semantic
- Semantic katmanı mesajın anlam sinyallerini üretir; relationship veya behavior state mutate etmez.
- Bütün intensity/severity skorları `0..1` aralığındadır.
- Hakaret sinyalleri kendi semantic alanlarıyla tutarlıdır.

### Entity Resolution
- Addressee kimliği Kaira'dır.
- `namedPeople` tekrarsızdır ve `named_person` reference ile desteklenir.
- Belirsiz kimlikler uydurulmaz; ambiguity olarak korunur.

### Canonical World Event
- `raw` orijinal kullanıcı mesajını korur.
- `certainty` `0..1` aralığındadır.
- Participant objeleri Firestore'a `undefined` alan taşımaz.
- Recall/query mesajları dünya gerçeği olarak persist edilmez.

### Retrieval
- Retrieval cevap yazmaz; evidence döndürür.
- Açık isimli recall sorgusunda evidence isimle eşleşmelidir.
- İki veya daha fazla kişi karşılaştırılıyorsa evidence set her açık kişiyi temsil etmelidir.
- Önceden yanlış persist edilmiş recall soruları evidence olarak dönmemelidir.
- Duplicate historical observations tek kişinin result limitini doldurup başka explicit isimleri dışarı itememelidir.

### Retrieval -> Response seam
- Grounded matching `reported_claim` varsa response generator bunu `kayıt yok` sayamaz.
- `reported_claim`, doğrulanmış dünya gerçeği değil kullanıcının aktardığı iddia olarak ifade edilir.
- Response generator retrieval kanıtını değiştiremez veya yeni actor/target icat edemez.

### Dynamic / Relationship State
- Mood ve relationship score alanları canonical aralıkların dışına çıkmaz.
- Sayaçlar negatif olamaz.
- Her işlenen kullanıcı mesajı relationship `interactionCount` değerini bir kez ilerletir.
- Third-party negatiflik Kaira-kullanıcı ilişkisine doğrudan hasar yazamaz.
- `conversationState` downstream sosyal davranış için authoritative state'tir.

### State -> Behavior seam
- `active` dışındaki relationship state'ler Conversation State Authority tarafından kilitlenir.
- `disengaged` durumda konuşmayı sürdürme, yeni soru, mizah ve yakınlık yeniden açılamaz.
- `repairing` durumda kesin affetme ve normal yakınlığa dönüş açılamaz.
- `distancing` durumda playfulness açılamaz.

### Behavior -> Response seam
- LLM çıktısı BehaviorContract'a aykırıysa deterministik enforcement teslimden önce düzeltir.
- `disengaged` konuşma generated text üzerinden yeniden açılamaz.
- `repairing` sırasında generated text erken `affettim / sorun yok / geçti gitti` kapanışı yapamaz.

## Contract registry / semantic revision

Aktif sözleşmeler `kairaContractRegistry.ts` içinde stable id + version ile kayıtlıdır.

Breaking semantic değişiklikte:
1. mevcut contract sessizce değiştirilmez,
2. yeni version açılır,
3. eski version `superseded` işaretlenir,
4. revision nedeni yazılır,
5. eski fixture'ın neden değiştiği açıklanır,
6. yeni consumer contract testleri eklenir.

Bu sayede `temporal memory geldi, en son kavramı değişti` gibi kasıtlı davranış revizyonları gerçek regression'lardan ayrılır.

## Test politikası

### 1. Fixture testleri
Somut konuşmalar korunur:
- `Ayşe bana salak dedi`
- `Ayşe bana özür diledi`
- `Ayşe en son bana ne demişti?`
- `Ayşe mi Merve mi bana salak demişti?`

Bunlar bir invariant'ın örneğidir; yeni mimari kural bu cümlelerin kendisinden türetilmez.

### 2. Contract/seam testleri
Producer-consumer sınırları ayrı test edilir:
- semantic -> entity/world-event
- world-event -> retrieval
- retrieval -> response evidence
- relationship state -> authority
- authority/state -> behavior contract
- behavior contract -> delivered response

### 3. State-sequence simulation
Exact cevap metni yerine çok-turn dizilerde şunlar kontrol edilir:
- state range
- relationship counter continuity
- third-party damage isolation
- disengagement persistence
- authority/behavior alignment

### 4. Bilinçli semantic revision
Yeni katman eski davranışın anlamını kasıtlı değiştirirse bu regression sayılmaz. Değişiklik hangi contract version'ını değiştirdiğini açıkça belirtir.

Sessiz test silme veya sadece mevcut implementasyonu spesifikasyon kabul etme yoktur.

## Geliştirme kuralı

Yeni bir bug bulunduğunda önce şu soru cevaplanır:

> Bu vaka hangi genel invariant'ın ihlalidir?

- Mevcut invariant ihlaliyse implementation fix + regression fixture eklenir.
- Invariant eksikse önce contract güncellenir, sonra implementation değiştirilir.
- Yeni özellik contract'ı bilinçli değiştiriyorsa semantic revision olarak belgelenir.

Amaç bugları bitirmek değildir. Amaç yeni özelliklerin hangi sistem yasalarını etkilediğinin önceden görünür olmasıdır.

## CI kapıları

Sıra:
1. Architecture contracts (`npm run test:contracts`)
2. Full Vitest suite
3. TypeScript
4. Production build

Architecture-contract kapısı kırmızıysa yeni feature ilerletilmez.

## Bundan sonraki büyüme sırası

1. V1 contract gate tamamen yeşil tutulur.
2. Yeni bulunan bug önce mevcut invariant'a bağlanır.
3. Daha geniş generated/property-style state-sequence senaryoları eklenir.
4. Temporal memory / contradiction resolution için önce yeni contract/version tasarlanır.
5. Multi-user world model için actor/target/ownership contract'ı revize edilmeden implementation başlanmaz.
6. Learned behavior policy gelirse BehaviorContract authoritative ara yüzü korunur; model doğrudan relationship state'i mutate etmez.
