# KAIRA Architecture Contracts v1

## Karar

Kaira geliştirmesinde yeni büyük katman eklemeden önce mevcut veri akışı contract/invariant seviyesinde sabitlenecek.

Örnek cümleler sistem tasarımının kendisi değildir. Örnekler regression fixture olarak tutulur; doğruluk ise katman sınırlarındaki genel sözleşmelerle tanımlanır.

**Durum: AKTİF.** CI architecture-contract testlerini full test/build zincirinden önce ayrı bir kapı olarak çalıştırır.

## Canonical akış

1. Language Understanding -> `SemanticEvent`
2. Entity Resolution -> `EntityResolutionResult`
3. World Event Mapping -> `CanonicalWorldEvent` V2
4. World Model Ownership -> account/session evidence isolation
5. World Model Store / Retrieval -> `EvidenceSet` (`RetrievedWorldEvent[]`)
6. Temporal Evidence Policy -> zaman sıralaması / latest seçimi / evidence preservation
7. Contradiction Evidence Resolution -> proposition + polarity conflict sets
8. Appraisal / Relationship / Temperament -> `DroitDynamicState`
9. Conversation State Authority -> authoritative social state
10. Behavior Policy -> `BehaviorContract`
11. Learned Policy Boundary -> yalnızca kısıtlayıcı proposal
12. Response Generation -> natural-language realization
13. Deterministic Enforcement / Consistency -> delivered response
14. Contract Audit -> invariant violations

Bir katman downstream katmanın işini üstlenmemeli. Ham kullanıcı cümlesi mümkün olduğunca erken canonical temsile indirgenmeli; downstream motorlar aynı anlamı yeniden bağımsız regex/heuristic ile çözmeye çalışmamalı.

## Invariantlar

### Semantic
- Semantic katmanı mesajın anlam sinyallerini üretir; relationship veya behavior state mutate etmez.
- Bütün intensity/severity skorları `0..1` aralığındadır.
- Hakaret sinyalleri kendi semantic alanlarıyla tutarlıdır.

### Entity Resolution
- Addressee kimliği Kaira'dır.
- `namedPeople` tekrarsızdır ve `named_person` reference ile desteklenir.
- Belirsiz kimlikler uydurulmaz; ambiguity olarak korunur.

### Canonical World Event V2
- `raw` orijinal kullanıcı mesajını korur.
- `certainty` `0..1` aralığındadır.
- Participant objeleri Firestore'a `undefined` alan taşımaz.
- Recall/query mesajları dünya gerçeği olarak persist edilmez.
- Kullanıcının açık üçüncü şahıs aktarımları (`Ayşe bana özür diledi`) epistemik olarak `reported_claim` kalır; doğrudan Kaira-kullanıcı etkileşimi sayılmaz.
- Yeni üretilen canonical event `proposition`, `polarity` ve `temporal` alanlarını taşır.
- `proposition.key`, actor + predicate + target üzerinden deterministik semantic kimliktir; LLM cümlesi veya retrieval score'una bağlı değildir.
- `proposition.predicate` canonical `eventType` ile uyumludur.
- `polarity` yalnızca `positive | negative | unknown` değerlerinden biridir.
- `temporal.relation` yalnızca `past | present | future | unspecified` değerlerinden biridir; `asksLatest` recall niyetini ayrıca taşır.
- Eski persist edilmiş V1 eventler okunabilir kalır; V2 alanları yeni event üretiminde zorunludur.

### World Model Ownership
- Her observation kalıcı bir `userId` ve `sessionId` taşır.
- Memory ownership event içindeki actor/target isminden türetilmez; persisted owner scope authoritative'dir.
- Bir kullanıcının retrieval candidate set'ine başka kullanıcıya ait observation giremez.
- Session filtering ownership'i değiştirmez; yalnızca owner'ın kendi history'sini daraltır.

### Retrieval
- Retrieval cevap yazmaz; evidence döndürür.
- Açık isimli recall sorgusunda evidence isimle eşleşmelidir.
- İki veya daha fazla kişi karşılaştırılıyorsa evidence set her açık kişiyi temsil etmelidir.
- Önceden yanlış persist edilmiş recall soruları evidence olarak dönmemelidir.
- Duplicate historical observations tek kişinin result limitini doldurup başka explicit isimleri dışarı itememelidir.

### Temporal Evidence
- `en son` sorgusunda entity-relevant candidate set içinde `createdAt` authoritative sıralamadır; lexical retrieval score eski kaydı yeni kaydın önüne geçiremez.
- Geçersiz timestamp `latest` kararı kazanamaz ve contract ihlali olarak görünür.
- Temporal sıralama observation `kind` / `status` epistemik bilgisini değiştiremez.
- Zaman içinde farklılaşan kayıtlar destructive overwrite ile tek sahte gerçeğe dönüştürülmez; eski evidence korunur.

### Contradiction Evidence
- Mantıksal contradiction yalnızca **aynı canonical proposition** için zıt açık polarity (`positive` + `negative`) bulunduğunda ilan edilir.
- Farklı predicate'ler veya sadece farklı raw metinler contradiction sayılmaz.
- Conflict set bütün source observation'ları korur; geçmiş kayıt silinmez veya overwrite edilmez.
- En yeni observation yalnızca `latest/current evidence` olarak işaretlenir; otomatik doğrulanmış dünya gerçeğine yükseltilmez.
- Retrieval -> response seam conflict set'i `ÇELİŞEN KANIT` olarak görünür kılar.
- Response layer çelişen iddiaları tek sahte gerçeğe birleştiremez; gerektiğinde önceki ve sonraki iddiayı ayrı ifade eder.

### Retrieval -> Response seam
- Grounded matching `reported_claim` varsa response generator bunu `kayıt yok` sayamaz.
- `reported_claim`, doğrulanmış dünya gerçeği değil kullanıcının aktardığı iddia olarak ifade edilir.
- Response generator retrieval kanıtını değiştiremez veya yeni actor/target icat edemez.
- `en son` cevabında temporal policy'nin ilk matching evidence'i kullanılmalıdır.
- `ÇELİŞEN KANIT` bulunduğunda latest evidence kullanılabilir fakat verified truth gibi sunulamaz.

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

### Learned Behavior Policy Boundary
- Learned model doğrudan `DroitDynamicState`, relationship score veya `conversationState` mutate edemez.
- Learned proposal authoritative `BehaviorContract`'ı yalnızca aynı seviyede tutabilir veya daha kısıtlayıcı hale getirebilir.
- `forbidden -> allowed`, `continueConversation=false -> true`, `forgivenessGranted=false -> true`, `short -> medium` relaxation yasaktır.
- Tamamlanmamış repair, learned proposal tarafından `repaired` yapılamaz.

### Behavior -> Response seam
- LLM çıktısı BehaviorContract'a aykırıysa deterministik enforcement teslimden önce düzeltir.
- `disengaged` konuşma generated text üzerinden yeniden açılamaz.
- `repairing` sırasında generated text erken `affettim / sorun yok / geçti gitti` kapanışı yapamaz.

## Contract registry / semantic revision

Aktif sözleşmeler `kairaContractRegistry.ts` içinde stable id + version ile kayıtlıdır.

`canonical-world-event@1` artık `superseded`; aktif sürüm `canonical-world-event@2`dir. V2 semantic revision'ın nedeni temporal/contradiction consumer'larının ham dili tekrar parse etmeden proposition identity + polarity + temporal reference tüketebilmesidir.

Breaking semantic değişiklikte:
1. mevcut contract sessizce değiştirilmez,
2. yeni version açılır,
3. eski version `superseded` işaretlenir,
4. revision nedeni yazılır,
5. eski fixture'ın neden değiştiği açıklanır,
6. yeni consumer contract testleri eklenir.

## Test politikası

### Fixture testleri
Somut konuşmalar korunur:
- `Ayşe bana salak dedi`
- `Ayşe bana salak demedi`
- `Ayşe bana özür diledi`
- `Ayşe en son bana ne demişti?`
- `Ayşe mi Merve mi bana salak demişti?`

Bunlar bir invariant'ın örneğidir; yeni mimari kural bu cümlelerin kendisinden türetilmez.

### Contract/seam testleri
Producer-consumer sınırları ayrı test edilir:
- semantic -> entity/world-event
- world-event -> ownership/store
- canonical V2 -> temporal/contradiction
- ownership -> retrieval
- retrieval -> temporal evidence
- temporal evidence -> contradiction evidence
- contradiction evidence -> response evidence
- relationship state -> authority
- authority/state -> behavior contract
- behavior contract -> learned policy boundary
- behavior contract -> delivered response

### State-sequence / property simulation
Generated kişi/olay dizilerinde state range, relationship continuity, query pollution, duplicate crowding, multi-name coverage, epistemics, temporal ordering, latest determinism, historical evidence preservation, contradiction preservation, cross-user isolation ve learned-policy relaxation attempts otomatik zorlanır.

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

1. Canonical V2 + temporal + contradiction contract gate yeşil tutulur.
2. Contradiction semantics yeni predicate türleri geldikçe proposition contract üzerinden genişletilir; raw cümle patch'leriyle büyütülmez.
3. Multi-user world model implementation'ı `world-model-ownership` contractı üzerinden yapılır.
4. Learned behavior policy implementation'ı `learned-policy-boundary` üzerinden yapılır; model doğrudan relationship state'i mutate etmez.
5. Yeni büyük memory/graph katmanları mevcut proposition identity ve evidence provenance alanlarını tüketir; aynı anlamı yeniden bağımsız parse etmez.
