# KAIRA Baseline Validation — 2026-08-30

## Sonuç

Baseline doğrulama fazı kapatıldı. Yeni davranış mimarisi eklemeden önce hedeflenen state, ilişki, world-memory, karar, persistence ve observability omurgası otomatik testlerle doğrulandı.

## Doğrulanan alanlar

### 1. Tur-bazlı state bütünlüğü — ÇALIŞIYOR / DOĞRULANDI
- 20 turluk deterministic senaryoda her tur ayrı `DroitDynamicState` snapshot'ı taşır.
- `interactionCount` tur başına bir kez artar.
- Sonraki turlar önceki state snapshot'larını geriye dönük değiştirmez.
- Final state geçmiş turlara kopyalanmaz.

### 2. Persistence / hydration — ÇALIŞIYOR / DOĞRULANDI
- `dynamicStateBefore` ve `dynamicStateAfter` her test-session turn belgesine ayrı kaydedilir.
- Hydration geçmiş turları session final state'inden yeniden üretmez.
- Reasoning/world metadata ilgili turun kendi kaydından geri yüklenir.

### 3. İlişki state geçişleri — ÇALIŞIYOR / DOĞRULANDI
- Doğrudan olumsuz davranış conflict/hurt/negativeEvents yönünü artırır.
- Tek nötr mesaj ilişki hasarını sıfırlamaz.
- Özür repair başlatabilir fakat kırgınlığı tek turda silmez.
- Hard-stop / disengaged ilişki nötr mesajla anında active durumuna dönmez.

### 4. Duygu state yönü — ÇALIŞIYOR / DOĞRULANDI
- Kaira'ya doğrudan saldırı öfke/stresi artırır; sakinlik/mutluluğu düşürür.
- Üçüncü kişiye yönelik negatif ifade Kaira'nın kendi ilişki hasarı gibi işlenmez.
- Kullanıcının düşük modu `duygusal_yük` olarak ele alınır; otomatik Kaira öfkesine çevrilmez.
- Pozitif etkileşim affect'i toparlanma yönüne iter.
- Özür akut aktivasyonu azaltabilir; unresolved relationship damage'i anında silmez.
- `hurt/conflict` anlamlı unresolved eşiğe geldiğinde nötr mesaj affect'i tek turda normale döndüremez.

### 5. Karar katmanı mimarisi — ÇALIŞIYOR / DOĞRULANDI
- `behaviorIntegrationEngine` ikinci bir bağımsız dynamic-state motoru değildir.
- Mevcut duygu/ilişki state'ini okuyup boundary/value/relationship/goal/preference/expression baskılarını hesaplar.
- Sonuçları `runtime*` davranış sinyallerine dönüştürerek KDM'nin ton, mizah, soru, mesafe, uzunluk ve konuşmayı sürdürme kararlarını yönlendirir.
- Dynamic state mutasyonu KDM/state otoritesinde kalır.

### 6. World reasoning / deterministic guard — ÇALIŞIYOR / DOĞRULANDI
- `WorldStateAppraisal -> WorldReasoningPolicy -> worldModelResponseGuard` zinciri aktiftir.
- Grounded memory varken hafızayı inkâr etme engellenir.
- Çelişkili evidence tek gerçeğe indirgenmez.
- `reported_claim` kaynak atfı korunur.
- `direct_interaction` yanlışlıkla kullanıcıdan duyulmuş bilgi gibi etiketlenmez.
- Gerekli epistemik qualifier deterministik olarak korunur.

### 7. YDM / AI parity — ÇALIŞIYOR / DOĞRULANDI
- Yerel Dil Motoru erken dönüşü deterministic world guard'ı bypass edemez.
- AI ve local cevap yolları aynı world appraisal/policy/guard boundary'sine tabidir.
- Provider farkı observability metadata'sında görünür kalır.

### 8. KNT / observability — ÇALIŞIYOR / DOĞRULANDI
Her tur için aşağıdaki zincirin kaybolmaması contract ile kilitlidir:
- `dynamicStateBefore`
- `dynamicStateAfter`
- `reasoningTrace`
- retrieved world evidence
- `worldStateAppraisal`
- `worldReasoningPolicy`
- `worldMemoryGuard`
- provider bilgisi
- timing bilgisi

Studio/KNT tarafında appraisal -> policy -> guard karar izi gözlemlenebilir durumdadır.

## Test metodolojisi

Bu fazda yalnız final KDM/state değerine bakılmadı. Her turun kendi snapshot'ı ve kendi metadata'sı test edildi. Testler mümkün olduğunca exact sayı yerine davranış invariant'larını ve doğru yönü kilitler; yanlış bir test varsayımı motor bug'ı olarak kabul edilmez.

Duygu directionality testinde ilk sürümde tek negatif tur sonrası hafif hasar, yanlışlıkla `unresolved hurt` kabul edildi. CI bunu yakaladı. Kod değiştirilmedi; test gerçek unresolved eşik senaryosuna düzeltilerek doğrulandı.

## CI kabul kapısı

Baseline fazının kabulü için aynı HEAD üzerinde aşağıdaki dört adımın birlikte yeşil olması gerekir:
1. Architecture contracts
2. Full Vitest suite
3. TypeScript `--noEmit`
4. Production build

## Kapanan önceki belirsizlikler

- “20 turun değerleri gerçek tur state'i mi, final state tekrar mı?” -> gerçek tur snapshot'ı.
- “Duygu ile ilişki aynı şey mi?” -> ayrı state boyutları; ilişki bağlamı affect iyileşmesini sınırlandırabilir.
- “Karar katmanı bağımsız state motoru mu?” -> hayır; yönlendirme/integration katmanı.
- “YDM world guard'ı bypass ediyor mu?” -> hayır.
- “World reasoning debug'da gerçekten persist/hydrate oluyor mu?” -> evet, turn bazında.

## Bilinen fakat bu baseline fazını bloke etmeyen sonraki işler

Bunlar artık baseline bug-fix değil, bir sonraki ürün/mimari fazıdır:
- KDM Cevap Planı'nı daha açık bir tek-authority response plan sözleşmesine dönüştürme.
- Kaira konuşma kimliğinin yalnız kural listesi değil ölçülebilir dil parmak izi haline gelmesi.
- Yerel Dil Motoru cevap çeşitliliği ve geniş typo/social-writing false-positive/false-negative matrisi.
- Hafıza türlerinin resmi ownership/schema sınırlarının sadeleştirilmesi.
- Kontrollü spontane davranış / kusurluluk katmanı.
- Sonrasında performans ve Firestore latency optimizasyonu.

## Faz geçişi

**Baseline validation tamamlandı.** Bundan sonraki mimari çalışma `KDM Cevap Planı + gelişmiş konuşma kimliği` fazıdır. Bu noktadan sonra state/persistence/world-reasoning altyapısını tekrar tekrar yeniden doğrulamak yerine mevcut contract suite regression kapısı olarak kullanılacaktır.
