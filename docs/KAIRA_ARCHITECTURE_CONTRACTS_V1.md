# KAIRA Architecture Contracts v1

## Karar

Kaira geliştirmesinde yeni katman eklemeden önce mevcut veri akışı contract/invariant seviyesinde sabitlenecek.

Örnek cümleler sistem tasarımının kendisi değildir. Örnekler regression fixture olarak tutulur; doğruluk ise katman sınırlarındaki genel sözleşmelerle tanımlanır.

## Canonical akış

1. Language Understanding -> `SemanticEvent`
2. Entity Resolution -> `EntityResolutionResult`
3. World Event Mapping -> `CanonicalWorldEvent`
4. World Model Store / Retrieval -> `EvidenceSet` (`RetrievedWorldEvent[]`)
5. Appraisal / Relationship / Temperament -> internal state transition
6. Behavior Policy -> behavioral intent / constraints
7. Response Generation -> natural-language realization
8. Consistency / Contract Audit -> invariant violations

Bir katman downstream katmanın işini üstlenmemeli. Ham kullanıcı cümlesi mümkün olduğunca erken canonical temsile indirgenmeli; downstream motorlar aynı anlamı yeniden regex/heuristic ile çözmeye çalışmamalı.

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

## Test politikası

### 1. Fixture testleri
Somut konuşmalar korunur:
- `Ayşe bana salak dedi`
- `Ayşe bana özür diledi`
- `Ayşe en son bana ne demişti?`
- `Ayşe mi Merve mi bana salak demişti?`

Bunlar bir invariant'ın örneğidir; yeni mimari kural bu cümlelerin kendisinden türetilmez.

### 2. Contract/seam testleri
Her producer-consumer sınırı ayrı test edilir. Örn. retrieval'ın doğru event döndürmesi tek başına yeterli değildir; response katmanının bu evidence'i kullanma sözleşmesi de test edilir.

### 3. Property/state-sequence testleri
Bir sonraki aşamada tekil fixture'lardan bağımsız, çok-turn event dizileri üretilecek. Kontrol edilen şey exact cevap metni değil; state continuity ve invariant ihlalleridir.

### 4. Bilinçli semantic revision
Yeni katman eski davranışın anlamını kasıtlı değiştirirse bu regression sayılmaz. Değişiklik:
1. hangi contract/invariant'ı değiştirdiğini belirtir,
2. eski testin neden supersede edildiğini açıklar,
3. yeni contract testlerini ekler.

Sessiz test silme veya sadece mevcut implementasyonu spesifikasyon kabul etme yoktur.

## Geliştirme kuralı

Yeni bir bug bulunduğunda önce şu soru cevaplanır:

> Bu vaka hangi genel invariant'ın ihlalidir?

- Mevcut invariant ihlaliyse implementation fix + regression fixture eklenir.
- Invariant eksikse önce contract güncellenir, sonra implementation değiştirilir.
- Yeni özellik contract'ı bilinçli değiştiriyorsa semantic revision olarak belgelenir.

Amaç bugları bitirmek değildir. Amaç yeni özelliklerin hangi sistem yasalarını etkilediğinin önceden görünür olmasıdır.

## Sonraki aşamalar

1. V1 contract validator'larını CI'da yeşil tut.
2. Retrieval -> response ve semantic -> world-event seam'lerini consumer-driven contract testleriyle büyüt.
3. Dynamic state / relationship continuity invariantlarını aynı contract katmanına taşı.
4. Property-based ve çok-turn simulation testlerine geç.
5. Temporal memory, contradiction resolution veya multi-user world model ancak ilgili contract değişiklikleri tanımlandıktan sonra eklenir.
