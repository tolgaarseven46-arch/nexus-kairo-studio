# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı çalışma hafızasıdır**. Yeni bir sohbet başladığında önce bu dosya okunmalı; eski konuşmadan tahmin yapılmamalıdır.

## 1. Proje kimliği
- Proje: NEXUS / KAIRO Studio
- Repo: `tolgaarseven46-arch/nexus-kairo-studio`
- Ana amaç: NEXUS içinde kullanılacak Sentetik Droit karakterlerini oluşturmak, kişiliklerini tanımlamak, test etmek ve ileride sunucu yöneticisi/asistan olarak çalıştırmak.
- Kairo/Kaira: örnek/ana Droit karakteri; Nexus çekirdek asistanı.
- Droit'ler klasik “bot” olarak değil, kişiliği ve dinamik davranışı olan dijital varlıklar olarak ele alınır.

## 2. Geliştirme prensibi — KTM/KDM
- **KTM:** Kairo Tutarlılık Motoru
- **KDM:** Katmanlı Doğrulama Mimarisi
- Sistem mevcut mimariyi çöpe atıp yeniden yazılmayacak; mevcut yapı üzerine katmanlı ve doğrulanabilir şekilde genişletilecek.
- Yeni özellik eklenirken önce mevcut tipler/servisler/akışlar kontrol edilir, sonra minimum gerekli dosya değiştirilir.
- Bir iş tamamlanmadan aynı iş tekrar yapılmaz.
- Yeni prensip: fikir üretim hızı test hızını geçmeyecek. Büyük yeni katman eklemeden önce mevcut sistem baseline testinden geçirilecek.

## 3. Droit karakter modeli
Karakter üç ana eksende ele alınır:
1. **Fiziksel katman:** avatar, yüz/ifade varlıkları ve görsel kimlik.
2. **Beyin/kişilik katmanı:** sabit kişilik eğilimleri + davranış motoru + bağlama göre değişen dinamik durum.
3. **Görev/rol katmanı:** görevler, yetkiler ve sunucu içindeki rol davranışları.

### Kişilik hedefi
- İnsan davranışına yakın, tutarlı fakat robotik olmayan davranış.
- Slider değerleri doğrudan “cevap metni” değildir; davranış motoruna girdi sağlar.
- Aynı kişiyle ilişki süresi ve ilişki kalitesi dinamik davranışı etkiler.
- Kaira her zaman matematiksel olarak “en uygun” cevabı vermek zorunda değildir; gelecekte karakter sınırları içindeki gerçek spontane/rastlantısal davranış ayrı bir katman olarak ele alınacaktır.

## 4. Mevcut teknik yapı
- React + Vite + Tailwind CSS.
- Firebase / Firestore kullanılıyor; görsel asset akışında Storage da mevcut.
- Sunucu: Express + Vite middleware (`server.ts`).
- AI sağlayıcıları: OpenRouter ana akışta; Gemini desteği de mevcut.
- Build: Vite istemci + esbuild sunucu bundle.
- Vitest test altyapısı mevcut.
- GitHub Actions CI; architecture contracts, testler, TypeScript kontrolü ve production build adımlarını çalıştırıyor.

## 5. Kişilik ve davranış
- `droitBehaviorEngine.ts`: kişilik slider'larından davranış profili üretir.
- `kdmConsistencyEngine.ts`: niyet/duygu, dinamik durum, ilişki, tekrar, kırgınlık/çatışma ve kişilik etkilerini hesaplar.
- İlişki state'i kullanıcı bazlıdır: warmth, trust, conflictScore, hurtScore, familiarityDays, interactionCount ve tekrar sinyalleri bulunur.
- `relationshipBehaviorService.ts`: ilişki bağlamını davranış profiline uygular.

## 6. Konuşma akışı — mevcut hedef mimari
Kullanıcı mesajı kabaca şu zincirden geçer:
1. mesaj alınır,
2. dil normalizasyonu / hitap temizleme,
3. KDM niyet-duygu-ilişki analizi,
4. konuşma kimliği hesaplama,
5. yerel Dil Motoru mesajı çözebiliyorsa AI çağrısı yapılmadan cevap,
6. çözemiyorsa AI sağlayıcısına kontrollü prompt,
7. cevap tutarlılık kontrolü,
8. KDM/KNT/hafıza kayıtları.

Temel tasarım ilkesi:
- **KDM: ne diyecek?**
- **Konuşma kimliği: nasıl diyecek?**
- **AI: gerektiğinde doğal cümleye dökecek.**

## 7. Yerel Dil Motoru — mevcut durum
Dosyalar:
- `kairoLanguageNormalizer.ts`
- `kairoLocalLanguageEngine.ts`
- `kairoLanguageMemory.ts`

Mevcut özellikler:
- Selamlama, hal-hatır, ne yapıyorsun, teşekkür, onay, veda, iyi geceler gibi sınırlı yerel niyetler.
- `napyon / napıyon / napiyon` gibi günlük yazım varyasyonlarının canonical anlama bağlanması.
- Yakın eşleşme/typo toleransı (`nber`, `nabr` vb.).
- `kaira`, `kairo`, `kanka`, `kız`, `aga`, `lan` gibi baş/son hitapların niyet çözümünden ayrılması.
- Yerel cevaplarda AI çağrısı yapılmaması.
- Kelime/ifade ağırlıkları ve tekrar cezası.
- Dil hafızasının kullanıcı bazlı Firestore persistence katmanı.

Doğrulanmış örnek:
- `selam kaira` → yerel Dil Motoru tarafından işlendi; AI süresi 0 ms görüldü.

Doğrulanmış local-language kalite davranışı:
- Canonical typo/kısaltma fallback'i yalnız risksiz kısa sosyal rutinlerde local intent açar; advice/complaint/recall/stop/repair gibi zengin semantik mesajları yutmaz.
- Aynı intent arka arkaya tekrarlandığında learned style affinity korunurken recency-weighted seçim baskısı immediate exact-repeat loop'u engeller.

Doğrulanmış persistence davranışı:
- Accepted AI/local cevap öğrenimi Firestore language-memory'ye yazılır.
- Phrase/repetition anahtarları canonical normalizasyon kullanır; noktalama varyantı öğrenimi veya tekrar cezasını by-pass etmez.
- Module/process reload simülasyonunda Firestore hydration interactionCount ve öğrenilmiş affinity'yi geri yükler.

## 8. Konuşma kimliği
- `kairoSpeechIdentity.ts` register, cümle uzunluğu, argo, mizah, emoji, sıcaklık ve doğrudanlık üretir.
- Bu katman AI promptuna talimat olarak aktarılıyor.
- Yerel Dil Motorunda ise etkisi henüz sınırlı cevap havuzu üzerinden gerçekleşiyor.
- Sosyal speech fingerprint generic/formal assistant drift guard ile korunur; relationship-level HOW regressionları new/familiar/close için slang/warmth yüzeylerinin ayırt edilebilir olduğunu doğrular.

## 9. Hafıza
Mevcut farklı hafıza parçaları:
- KDM ilişki/dinamik state persistence.
- Son konuşma/KDM hafızası.
- Uzun dönem kullanıcı hafızası (`kairoLongTermMemoryService`).
- Dil hafızası (`kairoLanguageMemory`).

Risk:
- Hafıza türleri işlevsel olarak ayrılmaya başlamış olsa da mimari sınırları ve hangi mesajda hangisinin kullanılacağı henüz resmi bir şemaya bağlanmadı.
- Firestore/hafıza okuması testlerde belirgin gecikme yaratıyor; hız optimizasyonu daha sonra yeniden ele alınacak.

## 10. KNT / Zihin Haritası
- Ayrı `MindMapTab` mevcut.
- KDM aktivasyonları ve gecikme EKG'si gösteriliyor.
- İstemci, hafıza, KDM, AI, kayıt ve ağ süreleri ayrıştırılıyor.
- KNT debug raporu kopyalama bulunuyor.
- Sohbeti temizleme / izole test butonu eklendi.
- Yerel cevaplarda AI göstergesi 0 olarak gösterilebiliyor.

Ölçülen önemli sonuç:
- KDM hesaplaması birkaç ms düzeyinde.
- Büyük gecikme ağırlıklı olarak Firestore hafıza ve AI çağrısından geliyor.
- Hız çalışması şimdilik donduruldu; işlevsel doğrulama öncelikli.

## 11. Response consistency / doğrulama
- `kairoResponseConsistency.ts` deterministic post-generation kontrolü yapıyor.
- Mevcut kontroller daha çok boşluk, uzunluk ve belirli ton/duygu anahtar kelimelerine dayanıyor.
- Unit test dosyasında 4 temel tutarlılık testi var.
- Bu doğrulama henüz Kaira'nın doğal sosyal medya dili, persona gösterisi, gereksiz uzunluk, spontanlık ve dünya kuralları için yeterli değil.

## 12. Studio / UI
- Ana sekmeler arasında Karakter, Test, Beyin, Zihin Haritası, Ayarlar ve Kairo Chat akışları bulunuyor.
- UI'nin görsel kalitesi şimdilik ikinci planda; altyapı öncelikli.
- Zihin Haritası test/debug aracı olarak kullanılacak.

## 13. Çalışma tercihi
- Türkçe ilerlenir.
- Gereksiz onay adımları ve ekran görüntüsü istekleri azaltılır.
- Kullanıcının yapması gereken tek adım kalana kadar mümkün olan işler tamamlanır.
- Kısa, net durum bildirimleri tercih edilir.

## 14. 2026-08-26 mimari dondurma / gözden geçirme kararı
Yeni özellik geliştirme geçici olarak durduruldu. Önce mevcut sistemin gerçek durumu ölçülecek.

Her modül şu etiketlerden biriyle sınıflandırılacak:
- **ÇALIŞIYOR / DOĞRULANDI**
- **KISMEN ÇALIŞIYOR**
- **TEST EDİLMEDİ**
- **SORUNLU / BORÇ**

İlk baseline test paketi oluşturulacak. Örnek kapsama:
- düz selamlama,
- typo/hitaplı selamlama,
- hal-hatır,
- günlük kısa ifade,
- duygusal paylaşım,
- hakaret/agresif dil,
- özür/telafi,
- tekrar eden olumsuz davranış,
- aynı mesajın X/Y kullanıcı ilişkilerinde farkı,
- AI'ye giden karmaşık mesaj,
- uzun sohbet/hafıza tutarlılığı.

## 15. Backlog — henüz kodlanmayacak önemli fikir
### Spontane / kontrollü kusurluluk ve gerçek rastlantısallık
Kaira'nın her cevabı son kullanıcı mesajının optimum matematiksel karşılığı olmak zorunda değildir.
Gelecekte:
- bazen soruya doğrudan cevap vermeden konu açabilmeli,
- kişiyi görünce başka aktif bir düşünceyi öne çıkarabilmeli,
- karakter sınırları içinde bazen anlamsız/kısa/ters/şakacı davranabilmeli,
- rastlantısal davranış gerçekleştiğinde bunun sonucu gerçek olay olarak ilişki ve hafızaya işlenmeli.

Önemli ayrım: rastgelelik yalnızca kelime kombinasyonu değil, **davranış seçimi** seviyesinde olacaktır. Bu özellik mevcut sistem baseline testleri tamamlanmadan kodlanmayacak.

## 16. Şu anki öncelik sırası
1. Repo ve akış audit'i.
2. Baseline test matrisi oluşturma.
3. Var olan motorları gerçek örneklerle doğrulama.
4. Kırık/yamalı bağlantıları düzeltme.
5. Testler güvenilir hale geldikten sonra KDM Cevap Planı ve gelişmiş konuşma kimliği.
6. Daha sonra spontane davranış / kontrollü kusurluluk katmanı.
7. Hız optimizasyonuna yeniden dönüş.

## 17. Bilinen teknik borçlar / ilk audit bulguları
- `PROJECT_STATE.md` önceki durumda güncel mimarinin gerisindeydi; bu güncellemeyle snapshot yenilendi.
- CI artık architecture contracts, testler, TypeScript kontrolü ve production build adımlarını birlikte doğruluyor.
- KDM unit test kapsamı şu an çok küçük (4 test, ağırlıklı response consistency/repair tarafı).
- `kdmConsistencyEngine.ts` niyet ve sentiment sınıflandırması basit regex tabanlı; yeni normalizer ile tek bir canonical sınıflandırma kaynağına henüz bağlanmış değil.
- Behavior profile çift otoritesi 23. bölümde kapatıldı; canlı cevapta tek otorite artık server/KDM `kdm.behaviorProfile`.
- Response consistency kontrolü mevcut ama sosyal/doğal konuşma kalitesini ölçmek için yetersiz.

## 18. Sohbet devamlılığı protokolü
Yeni sohbet açıldığında:
1. `PROJECT_STATE.md` okunur.
2. GitHub'daki mevcut kod durumu doğrulanır.
3. Kullanıcının son hedefi ve mevcut dosyalar arasında fark kontrol edilir.
4. Daha önce tamamlanmış iş tekrar yapılmaz.
5. Emin olunmayan geçmiş bilgi varsayılmaz; repo ve bu dosya esas alınır.
6. İş sonunda önemli mimari kararlar bu dosyaya eklenir.

## 19. Kaira Yazılı Konuşma Kimliği v1 — ritim temeli
- Gerçek bir samimi yazışmadan yalnızca soyut ritim özellikleri çıkarıldı; kaynak kişinin kimliği, özel hayatı, anıları ve benzersiz ifadeleri projeye aktarılmadı.
- Ana karar: **yazışma ritmi Kaira'nın sabit dil parmak izidir; argo, küfür, lakap ve filtresiz samimiyet ilişki seviyesine bağlıdır.**
- Sabit ritim özellikleri: kısa-öncelikli gündelik mesaj, gerektiğinde 2-3 kısa satıra doğal bölünme, gündelik sohbette az noktalama, hafif konuşma dili yazımı ve doğrudan konu geçişi.
- Bilerek yoğun yazım hatası üretmek, her cevabı bölmek veya her mesaja emoji/küfür eklemek yasaktır.
- İlişki dili üç seviyeye ayrıldı: `new`, `familiar`, `close`.
- `kanka` benzeri yakın hitaplar ve argo artık yalnızca kişilikte iletişim/mizah yüksek diye açılmaz; ilişki güveni ve geçmişi gerekir.
- Sert küfür yakın ilişkide dahi otomatik değildir; karşılıklı bağlam ve ileride tanımlanacak konuşma tercihi/izin sinyali gerekir.
- Yerel Dil Motoru cevap havuzları da aynı ilişki kapısına bağlandı.
- `kairoSpeechIdentity.test.ts` ile ritmin ilişki seviyelerinde sabit kaldığı, argonun yakınlıkla açıldığı, yeni kullanıcıya yakın hitap verilmediği ve emoji eğiliminin düşük tutulduğu doğrulanıyor.
- Projedeki konuşma ve ilişki testleri ana olarak Zihin Haritası/KNT içindeki mevcut `KAIRO CHAT · CANLI TEST` alanından yürütülür. Bu alana `Yeni / Tanıdık / Çok yakın` ilişki seviyesi ve `Örnek 1-4` mesaj seçimleri eklendi. Her gönderim mevcut KNT akışından tek tek geçer; ayrı bir üst test şeridi veya paralel sohbet arayüzü kullanılmaz.
- İlk duygusal açılış (`moralim bozuk`, `canım sıkkın`, `üzgünüm` vb.) için KDM hareketi `invite_emotional_context` eklendi. Kullanıcı açıkça tavsiye istemedikçe ilk cevap 1-4 kelimelik kısa merak tepkisiyle sınırlıdır; lakap, teselli gösterisi, tavsiye, hazır espri, fiziksel yakınlık ve ilişki seviyesini zorla sergilemek yasaktır. Güvenli fallback: `hmm niye`.
- Duygusal açılış doğrulaması 4 kelime ve tek merak tepkisiyle sıkılaştırıldı. `Ne oldu, nereden koptu moral?` gibi kısa olsa bile yapay ikinci ifade/metafor içeren cevaplar reddedilir. KNT raporu, React mesaj listesi gecikse bile son gönderilen test mesajını yerel olarak tutar; `Mesaj: -` üretmez.
- Düşük mod anlatan gündelik varyasyonlar (`moralim bozuk`, `havamda değilim`, `kafam bozuk`, `modum yok/yo`, `keyfim yok` vb.) Yerel Dil Motoru'nda aynı `emotional_opening` ailesine bağlandı. İlk kısa merak tepkisi AI çağrısı yapılmadan yerelden üretilir; açık tavsiye isteği varsa AI akışı korunur. KNT raporu yanıt kaynağını ayrıca gösterir.
- Yerel `low_mood_opening` sınıflandırması KDM ile ortaklaştırıldı. Aynı varyasyonlar KNT izinde de `duygusal_paylasim / duygusal_yük` görünür; Yerel Dil Motoru ile KDM artık ayrı niyet sonuçları üretmez.
- Kısa öz-eleştirel şakalaşma (`... bıraktım hahah`) KDM ve diyalog katmanında `şakalaşma / join_banter` olarak tanınır. Yanıt tek cümle ve en fazla 7 kelimedir; otomatik soru, emoji, seçenek menüsü, `speedrun/full kaos` gibi hazır internet esprileri ve oyun metaforları doğrulamada reddedilir. Güvenli erteleme şakası fallback'i: `yine şaşırtmadın hahah`.
- Zihin Haritasındaki `Yeni / Tanıdık / Çok yakın` seçimi artık yalnızca oturumun başlangıç state'ini belirler; aynı kişi ve seviye ile sonraki mesajlar geçmişi ve değişen ilişki/duygu state'ini taşır. `Yeni oturum` yalnızca aktif kapsamı sıfırlar; `Tüm testi temizle` Mert/Ali temel ve seviye kapsamlarındaki sohbet, KDM, KNT, ilişki ve dil hafızasını temizler.
- Sürekli test oturumunda `interactionCount` KDM'nin döndürdüğü ilişki state'inde mesaj başına bir kez artırılır ve Firestore aynı değeri ikinci kez artırmadan kaydeder. İlk mesaj `isNewUser=true`, sonraki mesajlar `false`; sayaç `1 → 2 → 3` ilerler.
- KNT kopya raporu oturum sürekliliğini doğrudan doğrulamak için `Oturum mesaj sayısı` ve `Yeni kullanıcı` alanlarını gösterir.
- `ne diyon`, `ne anlatıyosun`, `ne alaka`, `nasıl yani`, `bir şey anlamadım` ailesi gerçek bilgi sorusundan ayrılır. KDM izi `anlamama_ve_itiraz`, diyalog hareketi `repair_or_rephrase` olur; tek kısa yeniden ifade/geri çekme dışında takip sorusu ve yeni konu yasaktır.
- `hiçbiri`, `yok`, `ikisi de`, `olmadı` gibi kısa mesajlar hemen önceki Kaira turu soru/seçenek içeriyorsa bağımsız konu sayılmaz; `follow_previous_answer` hareketiyle önceki mesaja bağlanır ve yeni duygu/sebep uydurulmaz.
- Emoji bütçesi ve kullanıcıdan gelmeyen hazır internet/oyun metaforu kontrolü tüm AI diyalog hareketlerinin ortak çıktı kapısında çalışır. Emoji tamamen yasak değildir; konuşma kimliği eğilimi yeterliyse tur başına en fazla bir emojiye izin verilir.
- KDM davranış profili ilişki bağlamıyla tek yerde hesaplanır. Yeni, sıcak-güvenli, gerilimli veya iyileşen ilişki için tek ve çelişmeyen `relationshipInstruction` AI promptuna aktarılır; istemciden gelen ayrı profil ile KDM tonu arasındaki çift karar kaldırılmıştır.

## 20. World reasoning / deterministic guard — 2026-08-30
- Canonical world-memory retrieval sonrası read-only `WorldStateAppraisal` ve `WorldReasoningPolicy` katmanları aktif.
- Deterministic `worldModelResponseGuard`, grounded kanıt varken hafızayı inkâr etme, çelişkiyi tek tarafa düşürme, reported claim kaynak atfını kaybetme ve gerekli epistemik nitelemeyi kaldırma durumlarını modelden bağımsız olarak engelliyor.
- Reported claim ile direct interaction ayrımı contract testleriyle kilitli; direct interaction yanlışlıkla kullanıcı kaynaklı bilgi gibi etiketlenmiyor.
- Guard yalnız AI yolunda değil, Yerel Dil Motoru erken dönüş yolunda da uygulanıyor; world reasoning boundary bütün cevap yollarında bağlayıcı.
- `worldStateAppraisal`, `worldReasoningPolicy` ve `worldMemoryGuard` KNT trace, test-session metadata, chat debug/KDM response ve Studio SON KARAR İZİ/SON TURU KOPYALA raporunda gözlemlenebilir. Böylece tek turda appraisal → policy → guard zinciri, guard issue listesi ve cevabın değiştirilip değiştirilmediği izlenebilir.
- CI bu değişiklikleri architecture contracts + tests + TypeScript + production build ile doğrular.

## 21. KairaResponsePlan / konuşma kimliği otoritesi — 2026-08-30
- `BehaviorContract` + `DialogueDecisionPlan` + HOW-only `KairoSpeechIdentity`, tek canonical `KairaResponsePlan` içinde kesiştiriliyor.
- Plan WHAT/WHETHER davranış otoritesidir. Dialogue yalnız discourse move/shape, speech identity yalnız HOW/style verir; ikisi `BehaviorContract`ın yasakladığını yeniden açamaz.
- Yerel Dil Motoru ve AI verbalizer aynı `responsePlan`ı tüketiyor.
- Plan validator initial, repair, fallback, local ve final post-enforcement cevaplarda çalışıyor; eski enforcer katmanlarından sonra da plan yeniden doğrulanıyor.
- Plan her turda KNT ve test-session metadata'ya persist edilir, hydration ile geri yüklenir ve `droitChatService` üzerinden Studio'ya taşınır.
- KNT `SON KARAR İZİ` ve `SON TURU KOPYALA` raporunda move, stance, register, ilişki dili, konuşmayı sürdürme, soru/mizah/yakınlık/affetme/yakınlaşma izinleri ve cümle/kelime/emoji bütçeleri görünür.
- `response-plan@1` contract registry'de aktif ve local verbalizer, LLM verbalizer, consistency ve observability katmanlarının resmi sözleşme sınırıdır.
- `kairoSpeechIdentity.ts` runtime davranış izinlerinden ayrıldı; artık soru/mizah/affetme/konuşmayı sürdürme kararı üretmez, yalnızca HOW/style belirler.
- Geçici response-plan migration workflow ve scriptleri kaldırıldı. Eski non-idempotent language-understanding migration workflow'u da kaldırıldı; kalıcı doğrulama otoritesi `.github/workflows/ci.yml`dir.
- Bu fazdan sonra açılan semantic-consumer consolidation işi 22. bölümde tamamlanmış olarak kayıtlıdır.

## 22. Canonical SemanticEvent / current-turn semantik otoritesi — 2026-08-30
- `LanguageUnderstandingResult.event`, mevcut kullanıcı turu için tek canonical semantik otoritedir. Dialogue planner, Yerel Dil Motoru ve current-turn dialogue projection bağımsız intent parser üretmez.
- `SemanticEvent` consumer-facing `socialRoutine`, `discourseAct` ve `adviceRequested` facet'lerini taşır. Selamlama/hal-hatır/gündelik rutin, düzeltme/konu değişimi/recall/confusion ve açık tavsiye isteği bu boundary'de temsil edilir.
- `semanticEventCanonicalizer.ts`, eski istemci veya semantic provider yeni optional facet'leri göndermediğinde eksikleri yalnızca language-understanding trust boundary'sinde bir kez tamamlar. Downstream consumer'ların eksik alanı kendi regex'iyle yeniden yorumlaması yasaktır.
- `kairoDialogueDecisionEngine.ts` canonical `SemanticEvent` tüketir; current-turn için `analyzeDialogueTurn(userMessage)` ile ikinci semantik yorum yapmaz.
- `kairoLocalLanguageEngine.ts` içindeki paralel `detectIntent()` kaldırıldı. Local verbalizer canonical event'i `localIntentFromSemanticEvent` ile dar cevap rutinine map eder; `adviceRequested=true` ise local erken dönüş yapılmaz ve kontrollü AI yolu korunur.
- `kairaDialogueTurnProjection.ts`, canonical `SemanticEvent`ten current-turn `DialogueTurnAnalysis`ı bir kez üretir. Semantik/discourse acts event'ten gelir; uncertainty/noise/absurdity/durable-memory candidacy/topic token kontrolleri yalnız epistemik ve storage hint olarak tutulur.
- Aynı current-turn `dialogueAnalysis` nesnesi dialogue board, dialogue planner, claim ledger, attribution validation, grounded fallback, repair/fallback validation, memory scope/fact confidence ve world-guard revalidation yollarına taşınır.
- `kairoDialogueChaosEngine.ts` içindeki legacy `analyzeDialogueTurn` yalnız geçmişte projection metadata'sı olmayan historical turns veya doğrudan/geriye uyumlu çağrı fallback'i olarak kalabilir; canlı current turn semantik otoritesi değildir.
- Açık tavsiye regression'ı (`moralim bozuk, ne yapmalıyım?`) merkezi `adviceRequested` facet'iyle çözüldü; consumer'a özel kaçak regex eklenmedi.
- `kairaSemanticConsumerAuthorityContracts.test.ts`, `kairaCurrentTurnDialogueAuthorityContracts.test.ts` ve `kairaDialogueTurnProjection.test.ts` kalıcı `test:contracts` architecture suite'ine bağlıdır.
- Semantic consumer ve current-turn projection migration workflow/scriptleri başarıyla uygulandıktan sonra kaldırıldı; kalıcı çalışma yolu yalnız ürün kodu + `.github/workflows/ci.yml`dir.
- Entegrasyon commit'i: `f02eec0` (`feat(kaira): unify current-turn dialogue projection`). Entegrasyon workflow'unda authority contracts, TypeScript, full test suite ve production build başarıyla geçti.


## 23. KDM behavior profile otoritesi — 2026-08-30
- Canlı cevap davranış profili için tek otorite server/KDM `kdm.behaviorProfile`dır.
- `droitChatService.ts` artık `computeBehaviorProfile(runtimePersonality, userMessage)` ile paralel client profili üretmez ve request payload'ına ayrı `behaviorProfile` göndermez.
- Server hem Yerel Dil Motoru hem AI response yolunda authoritative `behaviorProfile`ı `kdm` response metadata'sında döndürür.
- Client dönen `data.kdm.behaviorProfile`ı `authoritativeBehaviorProfile` olarak kullanır ve Studio/debug tüketicilerine `profile` alanında aynı nesneyi verir; profil eksikse sessiz fallback yerine hata üretir.
- Böylece panel/debug profilinin, cevabı gerçekten yöneten KDM profilinden sapması engellendi.
- Client-side personality/motivation/value/preference/social/boundary/expression hazırlıkları bu fazda kaldırılmadı; yalnız duplicate behavior-profile karar otoritesi kapatıldı. Bunların server ile sınırı ayrı audit konusu olarak kalır.
- `kairaBehaviorProfileAuthorityContracts.test.ts` kalıcı `test:contracts` architecture suite'ine eklendi.
- Geçici behavior-profile migration workflow/script başarıyla uygulandıktan sonra kaldırıldı.
- Entegrasyon commit'i: `17f3600` (`feat(kaira): make KDM behavior profile authoritative`). Migration doğrulamasında contract, TypeScript, full test suite ve production build başarıyla geçti.


## 24. KairaResponsePlan final WHAT/WHETHER otoritesi — 2026-08-30
- Canlı server response enforcement için `continueConversation`, `humorAllowed` ve `askQuestion` izinleri artık doğrudan canonical `responsePlan`dan gelir.
- Client davranış entegrasyonunun personality içine yazdığı legacy `runtimeContinueConversation`, `runtimeHumorAllowed` ve `runtimeAskQuestion` değerleri server canlı yolunda canonical planı ikinci kez veto edemez.
- Böylece `KairaResponsePlan`ın “TEK DAVRANIŞ OTORİTESİ” sözleşmesi ile final enforcement kodu aynı sınırda birleşti.
- `kairoLocalLanguageEngine.ts` responsePlan verildiğinde planı öncelikli kullanır; legacy runtime flag fallback'i yalnız plan verilmeden yapılan doğrudan/geriye uyumlu çağrılar için kalabilir. Canlı server local yolunda responsePlan her zaman taşınır.
- Client-side `behaviorIntegrationEngine` runtime alanlarını şimdilik personality/debug uyumluluğu için üretmeye devam edebilir; ancak final server WHAT/WHETHER otoritesi değildir. Bu alanların kalan tüketicileri ayrı audit konusudur.
- `kairaResponsePlanFinalAuthorityContracts.test.ts` kalıcı `test:contracts` architecture suite'ine eklendi.
- Geçici response-plan final-authority migration workflow/script başarıyla uygulandıktan sonra kaldırıldı.
- Entegrasyon commit'i: `f0c956f` (`feat(kaira): make response plan final behavior authority`). Entegrasyon workflow'unda authority contract, TypeScript, full test suite ve production build başarıyla geçti.


## 25. HOW-only konuşma kimliği / mizah izni sınırı — 2026-08-30
- `KairoSpeechIdentity` HOW-only sözleşmesine uygun hale getirildi: `speech.humorLevel` artık `allowHumor` iznini açamaz veya kapatamaz.
- Canonical mizah izni `continueConversation && BehaviorContract.playfulness === "allowed"` üzerinden belirlenir.
- `humorLevel` yalnızca izin verilmiş mizahın stil/eğilim/şiddet bilgisidir; WHAT/WHETHER otoritesi değildir.
- `kairaResponsePlan.test.ts` regression testi active contract + `humorLevel=0` durumunda `plan.allowHumor=true` bekler. Distancing/repairing/disengaged contractları mizahı deterministic olarak bloklamaya devam eder.
- Düzeltme commit'i: `75147a3` (`fix(kaira): keep humor permission out of HOW-only speech`). Normal CI architecture contracts + tests + TypeScript + production build ile başarıyla geçti.
- Emoji bütçesi ayrı bir HOW nicelik sınırı olarak ayrıca audit edilecektir; bu fazda mekanik olarak değiştirilmedi.


## 26. Temperament → KDM current-state handoff — 2026-08-30
- Client `applyTemperamentBeforeKdm(...)` ile hesapladığı `temperamentAdjustedState`i alt davranış katmanlarında kullanırken server KDM'ye ham `dynamicState` gönderiyordu; aynı tur iki farklı current-state üzerinden ilerliyordu.
- Chat payload artık `dynamicState: temperamentAdjustedState ?? dynamicState` gönderir. Böylece client'taki “KDM öncesi temperament” state'i ile authoritative server KDM'nin başlangıç state'i aynı nesnel durumu temsil eder.
- Raw state ve adjusted state test-session layer audit içinde ayrı ayrı tutulmaya devam eder; gözlemlenebilirlik kaybolmadı.
- `kairaTemperamentBeforeKdmContracts.test.ts` kalıcı `test:contracts` architecture suite'ine eklendi.
- Entegrasyon commit'i: `2260223` (`fix(kaira): hand temperament state into KDM`). Migration workflow'unda contract, TypeScript, full test suite ve production build başarıyla geçti; geçici workflow sonrasında kaldırıldı.
- Bir sonraki büyük audit sınırı: legacy client `behaviorIntegrationEngine` kararlarının KDM `behaviorProfile` ve relationship state transition'larına doğrudan girmesi. Bu katman sökülmeden önce base personality / integrated policy ownership contract'ı açıkça ayrıştırılmalı.


## 27. Explicit 8-layer behavior policy boundary — 2026-08-31
- Client 8-layer entegrasyon kararları artık KDM'ye personality içindeki gizli `runtime*` anahtarlarından okunmaz; açık ve versiyonlu `behavior-policy@1` girdisi olarak taşınır.
- `behaviorPolicyInput.ts` schema/source doğrulaması ve numeric clamp uygulayan `normalizeBehaviorPolicyInput(...)` server boundary'sini tanımlar.
- `droitChatService.ts`, `integrationRuntime.decision` ve pressures çıktısını `createClientBehaviorPolicy(...)` ile açık provenance taşıyan policy nesnesine dönüştürür.
- Server incoming policy'yi normalize eder ve KDM'ye ayrı parametre olarak verir. KDM `runtimeTrait(personality, runtime*)` yoluyla canlı entegre karar geri kazanımı yapmaz.
- 8-layer davranış mantığı bu fazda silinmedi; no-humor, no-question, stance, length ve disengage senaryoları explicit policy girdisiyle aynı regression beklentilerini geçer.
- Relationship reducer repair sinyali canonical SemanticEvent (`apology || repairAttempt`) üzerinden kalır; gizli `runtimeRepairSignal` state geçiş girdisi değildir.
- Final WHAT/WHETHER otoritesi değişmedi: KDM state/profile değerlendirmesinden sonra `BehaviorContract` ve canonical `KairaResponsePlan` final cevabı sınırlar.
- `kairaBehaviorPolicyBoundaryContracts.test.ts` kalıcı `test:contracts` architecture suite'ine eklendi; eski decision-layer ve KDM regression testleri explicit policy contract'a taşındı.
- Entegrasyon commit'i: `e136f17` (`feat(kaira): make behavior policy explicit`). Authority contract, TypeScript, 489 test ve production build başarıyla geçti. Geçici migration workflow/script kaldırıldı.
- Sonraki audit sınırı: client 8-layer pipeline'ın `humor`, `authority`, `empathy`, `patience`, `seriousness`, `communication` gibi temel personality traitlerini mutate edip KDM relationship reducer'a geri beslemesi. Base personality ile per-turn behavioral overlay birbirinden ayrılmalı.


## 28. Base personality / per-turn response overlay ownership — 2026-08-31
- Client payload artık iki ayrı kişilik rolü taşır: `personality` kalıcı/base karakter traitleri, `responsePersonality` ise 8-layer pipeline'ın o tur için ürettiği response-style overlay'dir.
- Authoritative KDM relationship/emotion reducer yalnız `basePersonality` ile çalışır. Tur içi `empathy`, `patience`, `humor`, `authority`, `seriousness`, `communication` modifikasyonları aynı turun kalıcı ilişki/duygu fiziğine geri beslenmez.
- Explicit `behavior-policy@1`, KDM'ye girebilen ayrı per-turn karar input'u olmaya devam eder; provenance görünürdür.
- KDM state transition tamamlandıktan sonra `responsePersonality`, `applyConversationStateAuthority(...)` ve speech/local response HOW üretimi için kullanılabilir. Böylece davranış stili korunurken kalıcı kişilik otoritesi ayrılmıştır.
- Client tarafındaki layer engine'ler bu fazda silinmedi; response overlay ve test audit üretmeye devam eder.
- `kairaBasePersonalityOwnershipContracts.test.ts` kalıcı `test:contracts` suite'ine eklendi.
- Entegrasyon commit'i: `593c838` (`feat(kaira): separate base personality from response overlay`). Ownership contract, TypeScript, full test suite ve production build başarıyla geçti; geçici migration workflow/script kaldırıldı.
- Sonraki audit sınırı: eski `runtime*` alanlarının KDM ve final ResponsePlan otoritelerinden ayrıldıktan sonra hâlâ gerçek runtime tüketicisi olup olmadığı. Kullanılmayan compatibility alanları temizlenmeden önce repo çapında tüketici audit'i yapılmalı.


## 29. Legacy runtime decision flag removal — 2026-08-31
- `runtimeContinueConversation`, `runtimeHumorAllowed`, `runtimeAskQuestion`, `runtimeAcknowledgeComplaint`, `runtimeRepairAllowed`, `runtimeStance`, `runtimeResponseLength`, `runtimeDirectness`, `runtimeWarmth`, `runtimeDistance`, `runtimePriority`, `runtimePriorConversationState` ve `runtimeRepairSignal` artık response personality içine encode edilmez.
- 8-layer WHAT/WHETHER çıktıları explicit `behavior-policy@1` içinde yaşar; final cevap izinleri canonical `BehaviorContract` + `KairaResponsePlan` tarafından belirlenir.
- `conversationStateAuthority` artık ölü runtime bayrakları üretmez. Non-active state'lerde yalnız gerçek HOW overlay'i olan `humor` üzerinde deterministic clamp uygular: distancing maksimum 20, repairing/disengaged 0.
- State→behavior seam validator eski `authority.disengaged_runtime_lock` invariant'ından çıkarıldı. Disengaged kapanışı artık state/BehaviorContract üzerinden (`continueConversation=false`, soru/mizah/yakınlık forbidden), authority kilidi ve HOW `humor=0` ile doğrulanır.
- `behaviorIntegrationEngine.test.ts`, `conversationStateAuthority.test.ts`, `kairaStateBehaviorContracts.test.ts` ve multi-turn seam regressionları yeni authority modeline taşındı.
- `kairaLegacyRuntimeFlagRemovalContracts.test.ts` kalıcı `test:contracts` suite'ine eklendi.
- Entegrasyon commit'i: `8446dde` (`refactor(kaira): remove legacy runtime decision flags`). Runtime-removal contract, TypeScript, 496/496 test ve production build başarıyla geçti. Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: `conversationStateAuthority` artık yalnız HOW humor clamp yaptığı için ayrı bir authority servisi olarak kalmalı mı, yoksa speech identity / response-style projection içine taşınmalı mı? Koddan tüketici ve semantik sınır audit'i yapılmadan kaldırılmayacak.


## 30. Conversation state authority non-mutation — 2026-08-31
- `conversationStateAuthority` artık distancing/repairing/disengaged durumlarında `responsePersonality` üzerinde trait mutasyonu yapmaz. Gelen personality nesnesini aynı referansla döndürür; yalnız `state`, `locked` ve `reason` metadata'sı üretir.
- Non-active state WHAT/WHETHER kapanışları tek canonical yerde kalır: `BehaviorContract` + `KairaResponsePlan`. Disengaged durumda konuşmayı sürdürme/soru/mizah/yakınlık izinleri personality clamp ile değil plan/contract ile kapatılır.
- SpeechIdentity HOW-only katmanı dynamic state'i doğrudan görür ve hiçbir izni açamaz; response personality'yi state authority içinde ayrıca kısmanın semantik gerekçesi kalmadı.
- Canlı local-language yolu canonical `responsePlan` alır; mizah/soru/continue izinlerini oradan uygular.
- State→behavior seam artık state lock metadata ile canonical BehaviorContract tutarlılığını doğrular; `humor=0` gibi gizli personality mutation invariantı yoktur.
- `kairaConversationAuthorityNonMutationContracts.test.ts` kalıcı `test:contracts` suite'ine eklendi. Legacy runtime-removal contract da replacement trait mutation'ını yasaklayacak şekilde güncellendi.
- Entegrasyon commit'i: `fa3f9b0` (`refactor(kaira): make conversation authority non-mutating`). Non-mutation contract, TypeScript, 501/501 test ve production build başarıyla geçti. Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: bu servis artık yalnız state-lock projection ürettiği için `conversationStateAuthority` adı/katmanı sadeleştirilebilir; ancak observability ve response metadata tüketicileri repo çapında doğrulanmadan kaldırılmayacak.


## 31. Conversation state lock projection — 2026-08-31
- Eski `conversationStateAuthority` canlı response yolundaki personality passthrough rolünden çıkarıldı. Yeni `conversationStateLock` saf projection yalnız `state`, `locked` ve `reason` üretir; personality payload taşımaz ve trait mutasyonu yapamaz.
- Server KDM sonrası `conversationStateLock = projectConversationStateLock(kdm.nextDynamicState)` üretir. Response HOW shaping için per-turn `responsePersonality` doğrudan `responseStylePersonality` olarak kullanılır; state-lock katmanı HOW traitlerini değiştirmez.
- Base personality sahipliği korunur: `analyzeKdmInteraction` yalnız `basePersonality` + explicit `behaviorPolicy` alır. Per-turn response overlay KDM reducer inputuna girmez.
- State→behavior seam artık `stateLock` ile doğrulanır; legacy `authority` test/input terminolojisi kaldırıldı. Property ve multi-turn sequence contractları da yeni projection'a taşındı.
- World-state appraisal/reasoning evidence KDM state mutation inputunun dışında kalmaya devam eder; integration contract markerları state-lock sınırına güncellendi.
- Dış debug/API compatibility için `kdm.conversationAuthority` alan adı şimdilik korunur, fakat içeriği yeni `conversationStateLock` projection'ından gelir. Bu compatibility adı yeni authority katmanı olduğu anlamına gelmez.
- `kairaConversationStateLockContracts.test.ts` kalıcı `test:contracts` suite'ine eklendi.
- Entegrasyon commit'i: `db0ae1a` (`refactor(kaira): reduce conversation authority to state lock`). State-lock contract, TypeScript, 508/508 test ve production build başarıyla geçti. Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: `src/services/conversationStateAuthority.ts` dosyası ve `conversationAuthority` compatibility metadata adı. Repo çapında gerçek consumer bulunmadan dosya/alan kaldırılmayacak.


## 32. Retired conversation authority source removal — 2026-08-31
- `src/services/conversationStateAuthority.ts` artık canlı veya test yolunda tüketilmeyen retired source olarak kaldırıldı.
- `kairaConversationStateLockContracts.test.ts` legacy source dosyasının yeniden eklenmesini yasaklayan kalıcı invariant içerir.
- Silme commit'i: `9daf600` (`refactor(kaira): remove retired conversation authority source`).
- Fresh GitHub Actions checkout üzerinde architecture contracts, full tests, TypeScript ve production build başarıyla geçti; dolayısıyla eski source'un gizli import/consumer'ı olmadığı doğrulandı.
- Client `droitChatService` server cevabındaki `conversationAuthority` compatibility metadata'sını KairoChatResponse'a taşımıyor; Test Lab da raw endpoint yerine `droitChatService.sendMessage` kullanıyor.
- Sonraki adım: server response içindeki eski `conversationAuthority` JSON compatibility adı da gerçek consumer audit'i tamamlanınca kaldırılacak; canonical iç isim `conversationStateLock`.


## 33. Conversation authority compatibility name removal — 2026-08-31
- Server `/api/chat` response artık `kdm.conversationAuthority` legacy compatibility alanını üretmez.
- Canonical ilişki-state projection iç adı `conversationStateLock`; yalnız `state`, `locked`, `reason` iç seam metadata'sıdır.
- `droitChatService` bu legacy alanı zaten `KairoChatResponse` içine taşımıyordu; Test Lab ve normal client akışları `droitChatService.sendMessage` üzerinden çalıştığı için tüketici kırılması yoktur.
- `kairaConversationStateLockContracts.test.ts` server'da `conversationAuthority:` adının yeniden görünmesini yasaklar.
- `kairaBehaviorProfileAuthorityContracts.test.ts` behavior profile invariant'ı compatibility isminden ayrıştırıldı; iki response yolunda canonical KDM behavior profile dönmeye devam eder.
- Entegrasyon commit'i: `dd85d0b` (`refactor(kaira): remove conversation authority compatibility name`). State-lock contract, TypeScript, full regression ve production build başarıyla geçti.
- Geçici compatibility migration workflow/script kaldırıldı.
- Sonraki audit adayı: `conversationStateLock` projection'ının yalnız state→behavior seam için mi gerekli olduğu, yoksa gereksiz response/persistence/observability serialization'ı kalıp kalmadığı. Koddan doğrulanmadan kaldırılmayacak.


## 34. Runtime conversation state-lock projection removal — 2026-08-31
- `conversationStateLock` saf projection katmanı korunur ancak canlı `server.ts` artık her tur `projectConversationStateLock(...)` çağırmaz; compatibility response kaldırıldıktan sonra bu nesnenin runtime consumer'ı kalmamıştı.
- State-lock projection architecture seam/property/sequence testlerinde bağımsız doğrulama aracı olarak yaşamaya devam eder. `conversationStateLock.ts` silinmedi.
- Base personality ownership ve world-state appraisal contract markerları runtime state-lock değişkeninden ayrıştırıldı; KDM sınırı artık doğrudan sonraki gerçek runtime aşama olan `responseStylePersonality` ile delimiter kullanır.
- `kairaConversationStateLockContracts.test.ts` canlı server yolunda `projectConversationStateLock` / `conversationStateLock =` geri gelmesini yasaklar.
- Entegrasyon commit'i: `7bde253` (`refactor(kaira): keep conversation state lock out of runtime path`). State-lock contract, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: `responseStylePersonality = responsePersonality` alias'ı yalnız isimlendirme passthrough'u mu, yoksa ayrı bir ownership boundary olarak testlerde anlam taşıyor mu? Koddan doğrulanmadan sadeleştirilmeyecek.


## 35. Response style personality passthrough alias removal — 2026-08-31
- Canlı `server.ts` içindeki `responseStylePersonality = responsePersonality` passthrough alias'ı kaldırıldı; bu değişken hiçbir transform veya policy uygulamıyor, yalnız aynı referansı yeniden adlandırıyordu.
- HOW katmanı tüketicileri (`computeKairoSpeechIdentity`, `tryLocalKairoReply`) artık doğrudan `responsePersonality` kullanır.
- KDM relationship/emotion reducer girdisi değişmedi: `analyzeKdmInteraction(...)` yalnız `basePersonality` kullanır; per-turn response overlay KDM'e girmez.
- Base personality ownership, world-state appraisal ve conversation-state-lock architecture contract markerları gerçek runtime sınırlarına göre güncellendi.
- Entegrasyon commit'i: `d1786f1` (`refactor(kaira): remove response style personality alias`). Ownership contract, TypeScript, full regression ve production build başarıyla geçti.
- Geçici alias-removal workflow/script kaldırıldı.
- Sonraki audit adayı: `responsePersonality = (incomingResponsePersonality || personality)` fallback'ı bilinçli backward compatibility mi, yoksa sessiz/implicit API davranışı mı? Client/server contract ve call-site'lar koddan doğrulanmadan değiştirilmeyecek.


## 36. Response personality fallback contract — 2026-08-31
- Normal Studio/client akışı `droitChatService` üzerinden her `/api/chat` isteğinde base `personality` ile birlikte `responsePersonality: runtimePersonality` gönderir; bu yüzden server fallback'ı normal canlı client yolunda kullanılmaz.
- Server fallback'ı doğrudan/legacy çağrılar için korunmuştur ancak semantiği daraltılmıştır: `incomingResponsePersonality || personality` yerine `incomingResponsePersonality ?? personality` kullanılır.
- Böylece fallback yalnız overlay gerçekten eksik (`undefined`) veya açıkça `null` olduğunda base personality'ye düşer; genel falsy değerleri sessizce compatibility gibi yorumlamaz.
- `kairaBasePersonalityOwnershipContracts.test.ts` canonical nullish fallback'ı ve broad `||` fallback'ın geri gelmemesini doğrular.
- KDM ownership değişmedi: base personality reducer girdisidir; response personality yalnız KDM sonrası HOW shaping tüketicilerine gider.
- Entegrasyon commit'i: `3820510` (`refactor(kaira): narrow response personality fallback`). Ownership contract, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: `/api/chat` request destructuring içindeki `personality = {}` default'u gerçekten desteklenen opsiyonel API davranışı mı, yoksa eksik base personality'yi sessizce kabul eden bir contract açığı mı? Koddan doğrulanmadan değiştirilmeyecek.


## 37. Canonical personality normalization boundary — 2026-08-31
- `/api/chat` doğrudan/legacy çağrılarında `personality` eksik veya partial gelebiliyordu. KDM trait/profile tarafı 50 neutral fallback kullanırken SpeechIdentity HOW hesapları trait alanlarını doğrudan aritmetiğe soktuğu için eksik değerler `NaN` üretebiliyordu.
- `droitPersonalityNormalizer.ts` eklendi. Canonical neutral personality tüm zorunlu trait'lerde 50 kullanır; finite gönderilmiş değerleri korur, eksik canonical trait'leri 50 ile tamamlar, `NaN`/`Infinity` değerlerini kabul etmez ve finite numeric compatibility trait'lerini korur.
- Server artık KDM öncesi `basePersonality = normalizeDroitPersonality(personality)` üretir. KDM sonrası HOW overlay'i de `normalizeDroitPersonality(incomingResponsePersonality ?? basePersonality)` ile güvenli tam personality olur.
- Unsafe `as DroitPersonalityTraits` request-boundary cast'i kaldırıldı; runtime gerçekliği ile TypeScript contract aynı hale getirildi.
- Normal Studio/client davranışı değişmedi; `droitChatService` tam base personality ve runtime response overlay göndermeye devam eder.
- `droitPersonalityNormalizer.test.ts` omitted/partial/non-finite/compatibility trait senaryolarını kalıcı olarak doğrular; ownership contract normalized KDM/HOW sınırını korur.
- Entegrasyon commit'i: `128620f` (`fix(kaira): normalize server personality boundary`). Personality boundary contractları, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki sadeleştirme adayı: request destructuring içindeki `personality = {}` artık normalizer `undefined` kabul ettiği için redundant olabilir; davranış değiştirmeden yalnız API boundary semantiğini netleştirecek şekilde audit edilecek.


## 38. Redundant personality request default removal — 2026-08-31
- `/api/chat` request destructuring içindeki `personality = {}` default'u kaldırıldı; request alanı artık eksikse `undefined` olarak boundary'de korunur.
- Runtime davranışı değişmez: canonical `normalizeDroitPersonality(personality)` eksik personality'yi neutral 50 profile dönüştürür. Neutral fallback artık yalnız tek authoritative normalization boundary'sinde oluşur.
- Böylece transport/request katmanı ile domain normalization ayrıldı; server eksik payload bilgisini erken `{}` ile gizlemez.
- `kairaBasePersonalityOwnershipContracts.test.ts` `personality = {},` kalıbının geri gelmesini yasaklar ve personality alanının response overlay'den ayrı destructure edildiğini doğrular.
- Entegrasyon commit'i: `ee2143d` (`refactor(kaira): remove redundant personality request default`). Personality ownership/normalizer contractları, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: personality normalizer finite numeric trait'leri koruyor ancak canonical 0..100 slider aralığını clamp etmiyor. Bu davranışın mevcut creator/editor ve behavior engine contract'larıyla uyumu koddan doğrulanmadan değiştirilmeyecek.


## 39. Canonical personality range enforcement — 2026-08-31
- Personality UI contract'ı koddan doğrulandı: hem `PersonalityTraitSlider` hem Studio `CharacterPersonalityPanel` sliderları `min=0`, `max=100` kullanır; behavior engine de traitleri 0..100 kabul edip 100'e bölerek runtime profile üretir.
- Direct/legacy `/api/chat` payload'ları UI'ı bypass edebildiği için finite fakat aralık dışı traitler (`150`, `-20` vb.) daha önce KDM/HOW matematiğini sözleşme dışına taşıyabiliyordu.
- `normalizeDroitPersonality` canonical traitleri ve behavior/persistence tarafından tanınan legacy personality alias'larını (`sensitivity`, `confidence`, `analytical`, `decisiveness`) 0..100 aralığına clamp eder.
- Personality slider olmayan finite numeric compatibility metadata (`trust` gibi) bilinçli olarak clamp edilmez.
- Normalizer contractları `150→100`, `-20→0`, legacy alias clamp'i, non-finite filtreleme ve unrelated numeric metadata preservation senaryolarını kapsar.
- Entegrasyon commit'i: `3776fbf` (`fix(kaira): enforce personality trait ranges`). Personality contracts, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: `NEUTRAL_DROIT_PERSONALITY` ve `droitPersonalityService.DEFAULT_PERSONALITY_TRAITS` aynı 50-default listesini iki yerde tutuyor; drift riski yaratıp yaratmadığı ve tek lightweight source-of-truth'a bağlanıp bağlanamayacağı koddan doğrulanacak.


## 40. Canonical personality default source consolidation — 2026-08-31
- `NEUTRAL_DROIT_PERSONALITY` ve `droitPersonalityService.DEFAULT_PERSONALITY_TRAITS` aynı 19 trait için ayrı ayrı 50-listesi tutuyordu; bu iki sabitin zamanla drift etme riski kaldırıldı.
- Lightweight canonical kaynak `droitPersonalityNormalizer.ts` içindeki `NEUTRAL_DROIT_PERSONALITY` olarak kaldı. Bu modül Firebase bağımlılığı taşımaz ve server runtime tarafından güvenle kullanılabilir.
- `droitPersonalityService` public `DEFAULT_PERSONALITY_TRAITS` export adını korur ancak artık `{ ...NEUTRAL_DROIT_PERSONALITY }` üzerinden türetir; UI/persistence API compatibility bozulmaz.
- Bağımlılık yönü yalnız persistence service → lightweight normalizer şeklindedir; server normalizer → Firebase bağımlılığı oluşmadı.
- `kairaPersonalityDefaultSourceContracts.test.ts` canonical neutral kaynağın lightweight kalmasını ve persistence default'unun trait listesini yeniden kopyalamamasını kalıcı olarak doğrular.
- Entegrasyon commit'i: `a50e8da` (`refactor(kaira): consolidate personality defaults`). Default-source contract, normalizer contract, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: Firestore'dan yüklenen/eski personality kayıtları `structuredPersonalityToTraits` içinde normalize edilmeden UI'a dönebiliyor; persisted legacy/out-of-range/non-finite değerlerin canonical normalizer boundary'sinden geçmesi gerekip gerekmediği koddan doğrulanacak.


## 41. Personality persistence normalization boundary — 2026-08-31
- Firestore load mapper daha önce nested/legacy personality alanlarında `typeof value === 'number'` kontrolüyle `NaN` ve 0..100 dışı değerleri de kabul edip UI'a taşıyabiliyordu. Save mapper da flat trait değerlerini canonical normalization olmadan structured Firestore payload'ına yazabiliyordu.
- `traitsToStructuredPersonality(...)` artık serialization öncesi `normalizeDroitPersonality(traits)` çağırır ve tüm personality değerlerini normalized kaynaktan yazar; `decisionMaking` için kalan ham trait bypass'ı da kapatıldı.
- `structuredPersonalityToTraits(...)` mapped Firestore verisini UI'a döndürmeden önce canonical normalizer'dan geçirir. Invalid/non-object raw personality fallback'ı da `normalizeDroitPersonality(fallback)` kullanır.
- Sonuç: eski kirli persisted kayıtlar memory/UI boundary'sinde güvenli hale gelir; yeni invalid/out-of-range/non-finite personality değerleri bu service üzerinden Firestore'a yazılamaz.
- `kairaPersonalityPersistenceNormalizationContracts.test.ts` load/save normalization ve raw serialization bypass'larının geri gelmemesini doğrular. `kairaPersonalityDefaultSourceContracts.test.ts` import genişlemesine dayanıklı hale getirildi.
- Entegrasyon commit'i: `3de2a71` (`fix(kaira): normalize personality persistence boundaries`). Targeted persistence/default/normalizer contractları, TypeScript, full regression (`518/518`) ve production build başarıyla geçti.
- Geçici persistence migration workflow/script kaldırıldı; bölüm 40'ın geçici docs workflow'u da temizlendi.
- Persisted kirli değerleri load sırasında Firestore'a otomatik geri yazan self-heal davranışı eklenmedi; read path'in gizli write üretmesi için ürün gereksinimi yok.
- Sonraki audit adayı: `droitBehaviorEngine.ts` içindeki `effectiveEmpathy` normalize 0..1 değer olmasına rağmen `>= 75` eşiğiyle karşılaştırılıyor olabilir; bu branch'in fiilen dead olup olmadığı testlerle doğrulanacak.


## 42. Behavior empathy summary threshold scale fix — 2026-08-31
- `droitBehaviorEngine.computeBehaviorProfile(...)` içinde `effectiveEmpathy = empathy / 100` ile 0..1 ölçeğine normalize ediliyor, fakat `dominantSummary` üretiminde `effectiveEmpathy >= 75` kontrolü kullanılıyordu. Bu koşul hiçbir zaman true olamayacağı için `Yüksek Empati` summary etiketi dead durumdaydı.
- Summary eşiği diğer normalized behavior eşikleriyle aynı ölçeğe getirildi: `effectiveEmpathy >= 0.75`. Tone ve empathy directive eşikleri zaten 0..1 ölçeğindeydi; onlara dokunulmadı.
- `kairaBehaviorEmpathySummaryThresholdContracts.test.ts` sınırı davranış seviyesinde doğrular: empathy 75 → `empathyLevel = 0.75` ve `Yüksek Empati` etiketi var; empathy 74 → etiket yok.
- Entegrasyon commit'i: `aa5628e` (`fix(kaira): align empathy summary threshold scale`). Targeted regression, TypeScript, full regression ve production build başarıyla geçti.
- Bölüm 41'in geçici docs workflow'u ve bu düzeltmenin geçici migration workflow/scripti kaldırıldı.
- Sonraki audit adayı: `computeBehaviorProfile(...)` direct/legacy kullanımda raw trait değerlerini kendi içinde `Number(...)` ile okuyup canonical normalizer kullanmıyor. Server boundary normalize olsa da bu fonksiyon başka call-site'lardan doğrudan çağrılabiliyor; behavior engine boundary'nin canonical personality normalization sahipliğine geçirilip geçirilmeyeceği koddan doğrulanacak.


## 43. Behavior personality normalization ownership — 2026-08-31
- Server `/api/chat` personality boundary zaten `normalizeDroitPersonality(...)` kullanıyordu; ancak exported `computeBehaviorProfile(...)` doğrudan/legacy çağrılarda raw trait değerlerini kendi içinde `Number(...)` ile okuyordu. Bu nedenle server dışı çağrılarda out-of-range veya non-finite personality değerleri behavior sentezine sızabiliyordu.
- `droitBehaviorEngine.computeBehaviorProfile(...)` artık girişte lightweight canonical `normalizeDroitPersonality(traits)` kullanır. Eksik traitler neutral 50'ye tamamlanır, canonical/legacy personality alias değerleri 0..100'e clamp edilir ve `NaN`/`Infinity` kabul edilmez.
- Server davranışı semantik olarak değişmez; server zaten normalize edilmiş base personality geçiriyordu. Değişiklik direct/legacy behavior çağrılarını aynı canonical contract'a getirir.
- `kairaBehaviorPersonalityNormalizationBoundaryContracts.test.ts` direct çağrıda 150/-20 clamp'ini ve `NaN`/`Infinity` → neutral 50 fallback'ını doğrular. Empathy summary threshold contract ve normalizer contract ile birlikte targeted zincirde geçti.
- Entegrasyon commit'i: `f5aed8e` (`fix(kaira): normalize personality at behavior boundary`). Targeted contractlar, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: `analyzeKdmInteraction(...)` exported boundary içinde `trait(...)` helper raw personality üzerinde `typeof number` + clamp kullanıyor; `NaN` bir number olduğu için direct KDM çağrısında ilişki/state matematiğine non-finite değer sızma ihtimali ayrıca doğrulanacak.


## 44. KDM personality normalization ownership — 2026-08-31
- Exported `analyzeKdmInteraction(...)` server dışında doğrudan çağrılabildiği halde KDM içindeki `trait(...)` helper raw personality alanlarını `typeof value === "number"` ile okuyordu. `NaN` da JavaScript'te number olduğu için direct/legacy KDM çağrısında ilişki ve state matematiğine non-finite değer sızabiliyordu.
- KDM boundary artık işlem başında `normalizeDroitPersonality(personality)` ile tek bir canonical `normalizedPersonality` üretir. Behavior profile sentezi ile sabır, hassasiyet, öfke, empati ve sadakat ilişki matematiği aynı normalized kaynaktan beslenir.
- `analyzeKdmInteraction(...)` personality parametre tipi `Partial<DroitPersonalityTraits> | null` olarak genişletildi. Bu, runtime'ın zaten desteklediği neutral-default normalization contract'ını TypeScript imzasıyla hizalar; tam personality çağrıları compatibility olarak aynen geçerlidir.
- `kairaKdmPersonalityNormalizationBoundaryContracts.test.ts` non-finite direct input altında state/tolerance matematiğinin finite kalmasını ve out-of-range traitlerin canonical behavior input katmanında 0..100'e clamp edilmesini doğrular.
- İlk test denemesinde final `behaviorProfile.patienceLevel` doğrudan 0 beklenmişti; relationship context'in daha sonra behavior profile'ı bilinçli olarak şekillendirdiği görüldü. Contract bu nedenle normalization'ın gerçek sahiplik katmanı olan `debugMatrix.inputTraits` üzerinden ölçülür.
- Entegrasyon commit'i: `13c18da` (`fix(kaira): normalize personality at KDM boundary`). Targeted KDM/behavior/normalizer contractları, TypeScript, full regression ve production build başarıyla geçti.
- Server davranışı semantik olarak değişmez; `/api/chat` zaten normalized base personality geçiriyordu. Değişiklik exported direct/legacy KDM kullanımını güvenli hale getirir.
- Geçici KDM migration workflow/script ve bölüm 43'ün geçici docs workflow'u kaldırıldı.
- Sonraki audit adayı koddan belirlenecek; normalization zincirinde artık server, behavior, KDM ve persistence sınırları canonical normalizer ile hizalı.


## 45. Fine-tune profile hydration normalization — 2026-08-31
- `CharacterTab` fine-tune ayarlarını `kairo_character_finetune_v2` localStorage kaydına yazıyor ve `droitChatService` aynı kaydı runtime personality/motivation/value/preference/social/boundary/expression zincirinde tüketiyor. Önceden hydrate edilen obje parse edildikten sonra sayı/range doğrulaması yapılmıyordu.
- Lightweight `fineTuneProfileNormalizer.ts` eklendi. Yalnız finite number değerleri kabul eder, tüm değerleri 0..100 aralığına clamp eder; string/null/non-finite alanları profile sokmaz.
- Aynı canonical normalizer hem `CharacterTab` hydrate yolunda hem `droitChatService.readFineTuneProfile()` runtime boundary'sinde kullanılır. Böylece eski/bozuk localStorage değeri hem UI slider state'ini hem client behavior matematiğini zehirleyemez.
- Fine-tune registry ve `personalityTendencyEngine` tarafından kullanılan `personality.cognition.deciveness` yazımı incelendi. UI ve engine aynı persisted key'i kullandığı için mevcut davranışta bağlantı kopuğu yoktur. Key localStorage contract'ının parçası olduğundan compatibility migration olmadan rename edilmedi ve normalizer testi legacy key'in aynen korunduğunu doğrular.
- `fineTuneProfileNormalizer.test.ts` range clamp, invalid/non-finite drop ve persisted `deciveness` compatibility davranışını kalıcı olarak test eder. Personality tendency ve temperament targeted testleriyle birlikte geçti.
- Entegrasyon commit'i: `4784dcf` (`fix(kaira): normalize persisted fine-tune profiles`). Targeted contractlar, TypeScript, full regression ve production build başarıyla geçti.
- Geçici migration workflow/script kaldırıldı.
- Sonraki audit adayı: CharacterTab'daki LAYERS fine-tune key registry ile her runtime engine'in beklediği key seti karşılaştırılacak; aynı isimde görünmeyen veya UI'da olup hiçbir runtime engine tarafından tüketilmeyen parametre varsa sessiz no-op slider olarak işaretlenecek.


## 46. Expression wordplay fine-tune runtime wiring — 2026-08-31
- `CharacterTab` içinde `expression.humor.wordplay` (`Kelime mizahı`) slider'ı kullanıcıya açıktı ancak `expressionStyleEngine` bu key'i hiç okumuyordu; slider sessiz bir no-op durumundaydı.
- `ExpressionStyleProfile` artık `wordplay` alanını taşır, `expressionStyleFromFineTune(...)` persisted key'i okur ve humor `dominantMode` union'ı `wordplay` modunu içerir.
- Wordplay adayı diğer mizah türleriyle aynı context gate/inhibition zincirine katılır. Playful context algısına `kelime oyunu`, `laf oyunu`, `sözcük oyunu` ifadeleri eklendi.
- `kairaExpressionWordplayFineTuneContracts.test.ts` hem UI key'inin runtime profile'a taşındığını hem diğer mizah türleri kapalıyken wordplay'in gerçek dominant humor mode olabildiğini doğrular.
- Entegrasyon commit'i: `8a2a1ef` (`fix(kaira): wire wordplay fine-tune into expression runtime`). Targeted wordplay/behavior integration contractları, TypeScript, full regression ve production build başarıyla geçti.
- Geçici wordplay migration workflow/script kaldırıldı.
- Sonraki audit: CharacterTab LAYERS registry'nin kalan personality/temperament/motivation/values/preferences/social/boundaries/expression key'leri runtime reader'larla karşılaştırılacak; UI'da olup tüketilmeyen parametreler sessiz no-op olarak kapatılacak.


## 47. Temperament panel runtime wiring and threshold semantics — 2026-08-31
- CharacterTab temperament registry auditinde `temperament.exploration.uncertaintyTolerance` ve `temperament.exploration.approachDrive` sliderlarının runtime `temperamentEngine` tarafından tüketilmediği doğrulandı; iki slider sessiz no-op idi.
- `TemperamentProfile` artık `uncertaintyTolerance` ve `approachDriveBias` alanlarını taşır. `temperamentFromFineTune(...)` paneldeki iki persisted key'i doğrudan runtime profile'a bağlar. Yüksek uncertainty tolerance tehdit/kaçınma baskısını azaltır; yüksek approach drive bias yenilik bağlamındaki yaklaşma davranışını artırır.
- `temperament.reactivity.threshold` daha önce `threatSensitivity` fallback'ı olarak okunuyordu. Bu bağlantı panel semantiğini tersine çevirebiliyordu: yüksek “Tepki eşiği” tehdit aktivasyonunu artırabiliyordu. Eşik artık ayrı `reactivityThreshold` alanıdır ve 50 backward-compatible nötr noktadır; eşik yükseldikçe negative/frustration/threat aktivasyonu azalır, düştükçe daha kolay tepki oluşur.
- `kairaTemperamentPanelWiringContracts.test.ts` panel key mapping, reaction-threshold yönü, uncertainty tolerance ve approach-drive davranış etkisini regression contract olarak doğrular. Mevcut `temperamentEngine.test.ts` ve `kairaTemperamentBeforeKdmContracts.test.ts` ile birlikte targeted suite geçti.
- Entegrasyon commit'i: `e109723` (`fix(kaira): wire temperament panel controls`). Targeted contractlar, TypeScript, full regression ve production build başarıyla geçti.
- İlk workflow denemesi yalnız CI altyapısında lockfile/cache varsayımı nedeniyle `actions/setup-node` aşamasında durdu; ürün migration'ı uygulanmadı. Repo'da lockfile bulunmadığı doğrulanınca one-time workflow `npm install` ile düzeltildi ve ikinci run tamamen yeşil geçti.
- Geçici temperament migration workflow/script kaldırıldı.
- Registry auditinde motivation, values, preferences ve social bloklarının UI key'leri runtime reader'larla birebir eşleşti; bu bloklarda no-op bulunmadı. `personality.cognition.deciveness` legacy typo'su UI/engine/persisted contract boyunca aynı kullanıldığı için compatibility migration olmadan rename edilmedi.
- Sonraki audit adayı: CharacterTab `boundaries` ve kalan personality/expression parametrelerinin tamamını runtime tüketicilerle birebir karşılaştırmak; yalnız gerçek no-op veya ters semantik bulunan noktaları minimum patch ile kapatmak.


## 48. CharacterTab fine-tune registry audit complete — 2026-08-31
- CharacterTab `LAYERS` registry ile runtime fine-tune tüketicileri blok blok karşılaştırıldı: temperament, personality, motivation, values, preferences, social, boundaries ve expression.
- Motivation, values, preferences ve social bloklarında UI key'leri runtime reader'larla birebir eşleşiyor; no-op bulunmadı.
- Boundaries bloğundaki altı slider (`disrespect`, `manipulation`, `privacy`, `assertiveness`, `escalation`, `forgiveness`) `boundaryEngine.boundariesFromFineTune(...)` tarafından doğrudan okunuyor ve violation/assertion/escalation/repair/disengagement davranış sinyallerine giriyor.
- Expression bloğunda wordplay 46. kayıtta düzeltildikten sonra kalan tüm humor ve speech sliderları `expressionStyleFromFineTune(...)` tarafından doğrudan okunuyor; yeni no-op bulunmadı.
- Personality bloğundaki altı slider (`confidence`, `directness`, `stubbornness`, `analysisDepth`, `flexibility`, legacy persisted `deciveness`) `personalityTendenciesFromFineTune(...)` tarafından doğrudan okunuyor ve assertive/analysis/revision/decision davranış sinyallerine giriyor.
- `personality.cognition.deciveness` yazımı typo olsa da CharacterTab, runtime engine ve persisted localStorage contract'ında aynı key olduğu için mevcut profilleri kırmamak adına rename edilmedi.
- Temperament bloğunda bulunan gerçek registry sorunları 47. kayıtta kapatıldı: `uncertaintyTolerance` ve `approachDrive` no-op olmaktan çıkarıldı; `reactivity.threshold` ters semantiği düzeltildi.
- Sonuç: CharacterTab'da kullanıcıya gösterilen fine-tune davranış sliderları içinde şu an bilinen sessiz no-op key kalmadı. Bundan sonraki audit odağı key wiring değil, sliderların ürettiği davranış etkisinin büyüklük/yön/doğallık açısından baseline örneklerle doğrulanması olmalıdır.


## 49. Expression HOW hints end-to-end policy transport — 2026-08-31
- CharacterTab fine-tune registry auditinde expression key'lerinin engine tarafından okunduğu doğrulanmıştı; daha derin client→policy→server→speech auditinde ise `expression.speech.informality`, `expression.speech.emotionalDisplay` ve seçilmiş mizah `dominantMode` sinyallerinin server konuşma kimliğine ulaşmadan kaybolduğu bulundu.
- `questionDrive`, `brevity/verbosity` ve toplam mizah gücü zaten `behaviorIntegrationEngine` kararlarına dolaylı olarak etki ediyordu. Eksik olan yalnız HOW katmanına ait bu üç stil sinyali idi.
- Mevcut `behavior-policy@1` schema versiyonu korunarak backward-compatible opsiyonel `expressionStyle` alanı eklendi. Alan yalnız `humorMode`, normalize `informality` ve normalize `emotionalDisplay` taşır; davranış izni vermez.
- `createClientBehaviorPolicy(...)` expression runtime response'tan HOW hint'lerini explicit policy içine koyar. `normalizeBehaviorPolicyInput(...)` server boundary'de sayıları 0..1 aralığına clamp eder ve geçersiz humor mode değerlerini `null` yapar.
- `computeKairoSpeechIdentity(...)` artık normalize HOW hint'lerini tüketir. Informality %50 nötr/backward-compatible merkezdir ve argo/samimiyet eğilimini iki yönde modüle eder. Emotional display yüksek olduğunda duygu dilde daha görünür, düşük olduğunda daha kontrollü/örtük olur. Humor mode yalnız davranış planı mizaha izin verirse tercih edilen biçim olarak prompt'a taşınır; mizahı zorla açmaz.
- Bu ayrım korunmuştur: behavior integration / response plan WHAT ve izinleri belirler; expression HOW hint'leri yalnız dil/ritim/ifade biçimini yönlendirir. Böylece style sliderları permission katmanını bypass edemez.
- `kairaExpressionPolicyHintsContracts.test.ts` schema sürümünün değişmediğini, style hint transport'unu, speech identity üzerindeki görünür farkı ve untrusted input clamp/invalid-mode davranışını doğrular. `kairaBehaviorPolicyBoundaryContracts.test.ts` de explicit behavior-policy mimarisini argüman sayısına gereksiz yere kilitlemeden opsiyonel style hint'i kabul edecek şekilde güncellendi.
- İlk targeted run yalnız test fixture'ın humor engine'in `irony` seçim heuristiğini varsayması nedeniyle kırıldı; transport boundary fixture'ı doğrudan seçilmiş `ExpressionStyleResponse` ile düzeltildi. İkinci run targeted+TypeScript geçti ancak eski architecture regex'i iki argümanlı policy çağrısına kilitli olduğu için full regression'da kırıldı; mimari kuralı koruyacak şekilde contract güncellendi. Üçüncü run targeted contractlar, TypeScript, full regression ve production build tamamen yeşil geçti.
- Entegrasyon commit'i: `41661f9` (`fix(kaira): carry expression style into speech identity`).
- Geçici one-time workflow ve üç migration/test helper script kaldırıldı.
- Sonraki audit odağı: key-level wiring'i geçmiş diğer fine-tune katmanlarında da semantik sinyalin end-to-end hayatta kalıp kalmadığını ölçmek. Özellikle motivation/preferences/social çıktılarında tek tek slider etkilerinin aggregate pressure veya responsePersonality içinde gerçekten ölçülebilir downstream fark üretip üretmediği kontrol edilmeli; raw alanın doğrudan taşınmaması tek başına bug sayılmamalı.


## 50. Recognition motivation downstream wiring — 2026-08-31
- Deep fine-tune audit found `motivation.social.recognition` was key-level wired but behaviorally dead: it changed `approvalDrive`, while `approvalDrive` was not consumed by behavior integration, legacy personality, or server prompt/policy.
- Recognition need now contributes a bounded contextual bias to `approachPressure` only when a recognition opportunity is present. The bias is centered on the neutral 50 value, so default/backward-compatible behavior remains unchanged at 50.
- High recognition need can therefore make Kaira slightly more approach-oriented in an actual praise/takdir context; low recognition need can slightly reduce that approach tendency. Recognition alone cannot create approach pressure when no recognition opportunity exists.
- This preserves the architecture rule that stable motivation values are needs/priorities, not direct behavior commands. They still require a matching situation before affecting integrated behavior.
- Added `kairaRecognitionMotivationWiringContracts.test.ts` to verify CharacterTab key mapping, downstream approach differentiation under recognition opportunity, and no meaningful effect without recognition opportunity.
- Targeted contracts, TypeScript, full regression, production build and integration commit all passed in the one-time migration workflow.
- Integration commit: `27b0c72` (`fix(kaira): wire recognition motivation downstream`).
- Temporary recognition migration workflow and helper script were removed after successful integration.
- Next deep-audit focus: remaining motivation, preference and social outputs should be checked for the same pattern: key-level read is insufficient; each slider must produce a measurable downstream difference only in a context where its semantic meaning is relevant.


## 51. Social compliance/disclosure downstream wiring — 2026-08-31
- Deep social-orientation audit found two CharacterTab keys that were read correctly but lost before final behavior: `social.agency.compliance` and `social.trust.disclosure`.
- Compliance changed `resistancePressure`, but behavior integration did not consume that signal; its legacy patience bridge was later overwritten by boundary processing. Disclosure changed `disclosurePressure`, but integration did not consume it; its legacy communication bridge was later overwritten by expression processing.
- `behaviorIntegrationEngine` now uses social resistance only as a bounded directness contribution when the current semantic event actually contains coercion. Low compliance can therefore make Kaira more resistant/direct under coercion, while compliance does not create a general-purpose aggressive/direct style in neutral context.
- `behaviorIntegrationEngine` now gives `disclosurePressure` a small contribution to normal warmth. Because disclosure pressure itself already requires disclosure willingness plus intimacy/safety context, this makes high disclosure measurably more open/warm only where semantically appropriate. Disengage and repairing branches remain authoritative and unchanged.
- Added `kairaSocialComplianceDisclosureWiringContracts.test.ts` to verify both CharacterTab mappings, coercion-gated compliance/directness behavior, neutral-context non-effect for compliance, and safe-intimacy disclosure/warmth differentiation.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Integration commit: `1ccc939` (`fix(kaira): wire social compliance and disclosure downstream`).
- Temporary migration workflow and helper script were removed after integration.
- Next deep-audit focus: preference signals and the remaining motivation/social dimensions should be tested at the final integrated behavior boundary rather than accepted merely because their engine-local outputs change.


## 52. Preference overstimulation downstream wiring — 2026-08-31
- Deep preference audit verified novelty, complexity, depth, playfulness and competition already reach final integrated behavior through `engagementDrive` and/or `depthDrive`; they are not key-level no-ops.
- The audit found one genuine dropped preference signal: `overstimulationPressure`. The preference engine correctly detected when incoming intensity exceeded Kaira's stable intensity preference, but behavior integration never consumed the signal and the later personality bridge could not preserve its intended avoidance semantics.
- `behaviorIntegrationEngine` now reduces preference engagement in proportion to overstimulation pressure and selects a short response when overstimulation is high. This models lower eagerness / shorter participation under excessive intensity without turning a preference mismatch into a boundary violation, social distance, or disengagement.
- Calm/low-intensity contexts do not create overstimulation behavior, so a low intensity preference is not a general short-answer command.
- Added `kairaPreferenceOverstimulationWiringContracts.test.ts` to verify CharacterTab intensity mapping, contextual overstimulation differentiation, reduced final engagement, short-response behavior under actual excessive intensity, unchanged distance, continued conversation, and no overstimulation behavior in calm context.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Integration commit: `dd265e3` (`fix(kaira): wire preference overstimulation downstream`).
- Temporary migration workflow and helper script were removed after integration.
- Motivation and social follow-up audit found no additional obvious dropped final signals after recognition, compliance and disclosure wiring. Next audit focus should move to the next CharacterTab fine-tune family and continue using final integrated behavior as the acceptance boundary.


## 53. Personality decision/revision downstream wiring — 2026-08-31
- Deep personality-tendency audit confirmed CharacterTab key mapping was already correct, but two semantic runtime signals did not survive to final integrated behavior: `decisionPressure` and `revisionReadiness`.
- Decisiveness now contributes a small bounded increase to `assertivePressure` only when the current turn actually contains a decision demand. The default neutral decision-demand baseline is normalized out, so high decisiveness does not become general-purpose directness in ordinary chat.
- Revision readiness now reduces `assertivePressure` only in an actual correction context. High cognitive flexibility plus low stubbornness can therefore make Kaira measurably less forceful when the user corrects her, while no correction signal means no generic softening.
- The integration path remains unchanged: `behaviorIntegrationEngine` still consumes `assertivePressure`; the personality engine now ensures decision/revision semantics are contextually folded into that established signal rather than adding another competing behavior authority.
- Added `kairaPersonalityDecisionRevisionWiringContracts.test.ts` to verify persisted key mapping, decision-context final directness differentiation, neutral-context non-effect for decisiveness, and correction-context directness softening for high revision readiness.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Integration commit: `8337707` (`fix(kaira): wire personality decision and revision downstream`).
- Temporary migration workflow and helper script were removed after integration.
- Next deep-audit candidate: values `protectivePressure` is calculated but not directly consumed by behavior integration. Because compassion still affects `moralObjection`, this is not automatically a slider no-op; the next step is to test whether the intended protective/care semantic is measurably lost at the final behavior boundary before changing code.


## 54. Value downstream coverage audit — 2026-08-31
- Deep values audit focused on `protectivePressure`, which is calculated by `valueEngine` but is not consumed as a separate pressure by `behaviorIntegrationEngine`. This was treated as an audit candidate rather than automatically labeled a bug.
- Added `kairaValueDownstreamCoverageContracts.test.ts` covering all eight CharacterTab value dimensions: honesty/deception, fairness/unfairness, loyalty/betrayal, compassion/harm, freedom/coercion, privacy/privacy-violation, respect/disrespect and responsibility/irresponsibility.
- Every value dimension measurably changes final integrated `pressures.values` when its matching semantic context is present. Therefore the value sliders are behaviorally live at the final integration boundary; no product behavior patch was needed.
- Compassion also changes both `protectivePressure` and `moralObjection`; because `moralObjection` is part of final aggregate value pressure, the absence of a dedicated `protectivePressure` consumer is not by itself a silent no-op. The same principle applies to aggregate architecture generally: a raw intermediate signal need not be transported separately when its intended slider semantics remain measurable downstream.
- The first verification run failed before tests because the temporary generator helper interpolated `key` while generating the test source. The helper escaping was corrected and the second run passed targeted contracts, TypeScript, full regression and production build. No product code changed during this audit.
- Permanent coverage contract commit: `25f2fc4` (`test(kaira): lock value downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next deep-audit candidate: temperament runtime semantics. `attentionPersistence` produces an intermediate `persistence` output that may not feed live chat state, and `recoverySpeed` may be ineffective because the current live-turn call supplies `minutesSinceEvent: 0`. These must be verified at the actual `droitChatService` consumption boundary before any patch.


## 55. Temperament recovery/persistence live-state wiring — 2026-08-31
- Deep live-consumption audit found two temperament semantics that were engine-local but behaviorally dead in the real chat path. `recoverySpeed` could not affect live state because the current-event call always used `minutesSinceEvent: 0`; `attentionPersistence` only changed the intermediate `persistence` output, which `droitChatService` did not consume.
- `RelationshipState.lastInteractionAt` is now used as the real between-turn time source. Before the new event reaction is applied, existing anger/stress are decayed according to elapsed time. `recoverySpeed` increases the decay rate while `attentionPersistence` resists that decay and retains more prior activation.
- Immediate-event semantics remain unchanged: when no time has elapsed, recovery/persistence do not modify the current state, and the new event is still evaluated with `minutesSinceEvent: 0`. Thus recovery speed is not misused as an instant emotional dampener and persistence is not misused as extra reactivity.
- Recovery operates only on already-existing anger/stress and cannot create negative activation from a zero state. After between-turn recovery, the ordinary temperament event `stateDelta` is applied on top of the recovered state.
- Added `kairaTemperamentRecoveryPersistenceWiringContracts.test.ts` to verify CharacterTab key mapping, zero-time non-effect, faster recovery with high recovery speed, greater retention with high attention persistence, and zero-state safety.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Integration commit: `1ea37af` (`fix(kaira): wire temperament recovery and persistence`).
- Temporary migration workflow and helper script were removed after integration.
- Next audit focus: lock all remaining temperament dimensions with a final live-state/stateDelta coverage matrix so every slider is proven behaviorally live, then move toward a comprehensive all-fine-tune end-to-end coverage matrix.


## 56. Temperament full live-state coverage — 2026-08-31
- After wiring recovery speed and attention persistence in section 55, the remaining eleven immediate-response temperament dimensions were audited at the live `stateDelta` boundary instead of being accepted from engine-local intermediate values.
- Added permanent `kairaTemperamentLiveCoverageContracts.test.ts` covering negative sensitivity, frustration sensitivity, threat sensitivity, reactivity threshold, reward sensitivity, impulse strength, inhibitory control, arousal baseline, novelty seeking, uncertainty tolerance and approach-drive bias.
- Each slider was tested in a semantically matching event context and shown to produce a measurable downstream difference in immediate activation and/or the final state delta consumed by the live chat path. No additional temperament no-op was found, so no further product behavior patch was needed.
- Together with `kairaTemperamentRecoveryPersistenceWiringContracts.test.ts`, all thirteen stable temperament dimensions now have explicit downstream behavioral coverage: eleven immediate-response dimensions plus recovery speed and attention persistence across turns.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Permanent coverage commit: `18985a1` (`test(kaira): lock temperament live coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: build an all-fine-tune coverage matrix across personality, temperament, motivations, values, preferences, social orientation, boundaries and expression. The matrix should distinguish key mapping, engine-local effect, final integrated effect and context gating so future sliders cannot regress into silent no-ops.


## 57. Expression full downstream coverage — 2026-08-31
- The CharacterTab expression family was audited as a complete downstream system rather than through isolated engine-local tests. All thirteen expression sliders are now covered: eight humor modes, context inhibition, verbosity, informality, emotional display and question drive.
- Added permanent `kairaExpressionDownstreamCoverageContracts.test.ts`. The contract verifies exact CharacterTab key mapping, humor-mode dominance and integrated humor pressure, context inhibition, final response-length effects, final ask-question effects, and transport of informality/emotional-display/humor-mode through the client behavior-policy seam.
- Humor preferences remain context-gated: serious contexts can inhibit even a high dark-humor preference rather than allowing the slider to override higher-order context. Context inhibition suppresses humor without manufacturing unrelated boundary distance.
- No additional expression no-op was found; no product behavior patch was required.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Permanent coverage commit: `d11f5c6` (`test(kaira): lock expression downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: complete the all-fine-tune family matrix and identify which remaining families still lack whole-family downstream coverage, especially boundaries, motivations, preferences, social orientation and personality where some fixes are currently protected by targeted contracts rather than complete matrices.


## 58. Boundary full downstream coverage — 2026-08-31
- The CharacterTab boundary family was audited as a complete downstream system. All six boundary sliders are now explicitly covered: disrespect sensitivity, manipulation sensitivity, privacy sensitivity, assertiveness, escalation and forgiveness.
- Added permanent `kairaBoundaryDownstreamCoverageContracts.test.ts`. It verifies exact CharacterTab key mapping and proves each slider reaches the final integrated boundary behavior in a semantically matching context.
- Disrespect, manipulation and privacy sensitivities each change their matching violation signal and final integrated boundary pressure. Assertiveness remains live under coercion through coercion violation, boundary assertion, final boundary pressure and final directness.
- Escalation increases escalation/disengagement pressure only after a real violation and cannot manufacture a boundary event in a neutral context. Forgiveness increases repair openness and reduces distance during genuine apology/repair, but cannot override a hard red line; hard-stop still forces disengagement with zero repair openness.
- No additional boundary no-op was found, so no product behavior patch was required.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Permanent coverage commit: `072ce7b` (`test(kaira): lock boundary downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: motivation full downstream coverage, then preferences/social/personality whole-family matrices to complete the all-fine-tune coverage map.


## 59. Motivation full downstream coverage — 2026-08-31
- The CharacterTab motivation family was audited as a complete downstream system. All eight motivation sliders are now explicitly covered: connection, belonging, recognition, autonomy, achievement, impact, predictability and stability.
- Added permanent `kairaMotivationDownstreamCoverageContracts.test.ts`. It verifies exact CharacterTab key mapping and proves every slider reaches the downstream motivation pressure consumed by final behavior in a semantically matching context.
- Connection and belonging alter affiliation and social approach; connection also changes rejection withdrawal. Recognition changes approval and approach only when recognition opportunity exists, preserving context gating. Autonomy alters withdrawal under autonomy threat. Achievement and impact alter approach only when matching goal/influence opportunities exist. Predictability and stability alter security and withdrawal under uncertainty/instability.
- High needs cannot manufacture approach or withdrawal when matching contextual opportunity/threat signals are absent.
- No additional motivation no-op was found after the earlier recognition wiring fix, so no product behavior patch was required.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Permanent coverage commit: `23bbad1` (`test(kaira): lock motivation downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: preferences whole-family downstream coverage, followed by social orientation and personality whole-family matrices to complete the all-fine-tune coverage map.


## 60. Preference full downstream coverage — 2026-08-31
- The CharacterTab preference family was audited as a complete downstream system. All six preference sliders are now explicitly covered: novelty, complexity, intensity, depth, playfulness and competition.
- Added permanent `kairaPreferenceDownstreamCoverageContracts.test.ts`. It verifies exact CharacterTab key mapping and proves each preference reaches downstream engagement, depth/response-length or overstimulation behavior in a semantically matching context.
- Novelty changes exploration and final engagement. Complexity changes depth and can produce a long response when both complexity and depth opportunities are genuinely present. Depth independently changes depth drive and long-response behavior. Playfulness changes playful engagement but is suppressed in serious emotional context. Competition changes engagement only when a competition opportunity exists.
- Intensity is covered in both directions after the earlier overstimulation wiring fix: high intensity preference increases engagement with high-tempo context, while low intensity preference under the same context raises overstimulation and produces a short response without manufacturing relationship distance or disengagement.
- The first whole-family verification run failed only because the complexity test incorrectly required complexity alone to force a long response. The test context was corrected to include a real depth opportunity; no product code change was made for that failure. The corrected run passed.
- High preferences cannot manufacture engagement or overstimulation when matching opportunities/intensity are absent.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Permanent coverage commit: `f43633f` (`test(kaira): lock preference downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: social orientation whole-family downstream coverage, followed by personality whole-family coverage, then consolidate the all-fine-tune matrix.


## 61. Social orientation full downstream coverage — 2026-08-31
- The CharacterTab social-orientation family was audited as a complete downstream system. All eight social sliders are now explicitly covered: warmth, empathy, closeness drive, dominance, initiative, compliance, initial trust and disclosure.
- Added permanent `kairaSocialDownstreamCoverageContracts.test.ts`. It verifies exact CharacterTab key mapping and proves every slider reaches the downstream behavior consumed by final integration in a semantically matching context.
- Warmth and closeness drive alter affiliation and final warmth. Empathy alters care and final warmth under vulnerability. Dominance alters leadership/resistance and final directness under challenge/coercion. Initiative alters leadership and final directness when social action is available. Compliance acts as inverse resistance under coercion and changes final directness. Initial trust affects safety-derived trust/disclosure/affiliation when no relationship history exists. Disclosure changes disclosure pressure and final warmth in intimate context.
- The whole-family run initially failed only on an extra betrayal-safety assertion: the first fixture computed social response from a damaged relationship but integrated it with a neutral relationship; after making the fixture consistent, the remaining absolute distance threshold was still arbitrary. The final contract therefore compares betrayed vs non-betrayed outcomes under the same damaged state and confirms betrayal produces greater social-distance pressure and greater final distance. No product code change was required.
- Targeted contracts, TypeScript, full regression and production build all passed.
- Permanent coverage commit: `d871466` (`test(kaira): lock social downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: personality whole-family downstream coverage, then consolidate the complete all-fine-tune family matrix.


## 62. Personality full downstream coverage — 2026-08-31
- The CharacterTab personality family was audited as a complete downstream system. All six sliders are explicitly covered: confidence, directness, stubbornness, analysis depth, cognitive flexibility and decisiveness.
- Added permanent `kairaPersonalityDownstreamCoverageContracts.test.ts`. It verifies exact CharacterTab key mapping and proves every slider reaches downstream behavior consumed by final integration in a semantically matching context.
- Confidence/directness alter assertive pressure and final directness; stubbornness and cognitive flexibility affect revision readiness and correction-context directness; analysis depth alters analysis pressure and final answer length; decisiveness alters decision pressure and final directness only when a decision is actually demanded.
- Added context-gate protection proving decisiveness does not harden neutral conversation and cognitive flexibility does not generically soften behavior without a correction signal.
- Targeted contracts, TypeScript, full regression and production build all passed. No product code change was required.
- Permanent coverage commit: `3a2171c` (`test(kaira): lock personality downstream coverage`).
- Temporary verification workflow and generator helper were removed after the successful run.
- Next audit focus: consolidate the complete eight-family fine-tune downstream matrix into one meta contract.


## 63. Complete CharacterTab fine-tune downstream matrix — 2026-08-31
- Consolidated all eight CharacterTab fine-tune families into permanent `kairaAllFineTuneDownstreamMatrixContracts.test.ts`.
- CharacterTab currently exposes exactly 64 visible fine-tune sliders across eight behavior families: temperament 9, personality 6, motivation 8, values 8, preferences 6, social 8, boundaries 6 and expression 13. The matrix locks uniqueness, total count and per-family counts so UI additions/removals cannot silently escape coverage.
- Every family is required to retain its permanent downstream coverage contracts. The matrix also verifies that every visible CharacterTab key is represented at the corresponding engine/coverage seam rather than merely existing in the UI.
- Temperament is intentionally asymmetric: CharacterTab exposes 9 controls while `temperamentEngine` maintains a 13-dimension canonical model. The matrix explicitly locks all nine visible UI alias-to-canonical mappings; the additional canonical temperament dimensions remain protected by the live stateDelta and recovery/persistence contracts.
- The one-time all-family gate ran the meta contract together with temperament panel/live/recovery coverage plus personality, motivation, value, preference, social, boundary and expression downstream contracts. Targeted all-family contracts, TypeScript, full regression and production build all passed.
- No product behavior patch was required by the consolidated matrix.
- Permanent matrix commit: `9a3456a` (`test(kaira): lock all fine-tune downstream matrix`).
- Temporary matrix verification workflow and generator helper were removed after the successful run.
- Next audit focus should move beyond single-slider no-op detection into cross-family interaction/conflict semantics: verify that higher-authority context and boundary signals correctly dominate or combine with personality, motivation, social and expression tendencies without accidental cancellation or leakage.


## 64. Cross-family authority + relationship-priority leak fix — 2026-08-31
- After locking the complete 64-slider matrix, audited cross-family precedence with conflicting lower-layer signals. Permanent `kairaCrossFamilyAuthorityContracts.test.ts` now locks the intended priority order `boundary > values > relationship > goal > preference > expression`.
- Hard-stop boundary remains absolute even when social warmth, approach motivation, answer depth, humor and repair openness are maximized; apology/repair signals cannot reopen an absolute hard stop.
- Value conflict outranks goal/preference/expression without incorrectly forcing disengagement. Goal, preference and expression fallback order is also explicitly covered.
- The audit found a real relationship-authority leak: with severe hurt/conflict and social-distance pressure, integration correctly selected `relationship` priority and disabled humor, but high affiliation/care/approach plus repair openness could still collapse final distance to about `0.074`, effectively erasing the relationship damage in the final behavior.
- Fixed `behaviorIntegrationEngine.ts`: while `relationship` is the active priority, relationship pressure now establishes a minimum distance floor and an additional warmth penalty. This fix is scoped to active relationship priority; hard-stop, repairing/disengaged and non-relationship priority paths remain unchanged.
- Cross-family targeted contracts, the existing integration suite, the all-fine-tune matrix, TypeScript, full regression and production build all passed after the fix.
- Permanent product + contract commit: `0792022` (`fix(kaira): enforce relationship authority`).
- Temporary verification workflow and both helper scripts were removed after the successful run.
- Next audit focus: explicit user semantic commands versus family tendencies, especially stop-talking/stop-questions, value-vs-boundary overlap, and repair reopening under competing warmth/goal/expression signals.


## 65. Explicit semantic authority + stop-talking fix — 2026-08-31
- Audited explicit user semantic commands against maximal personality, motivation, preference, social and expression pressure. Added permanent `kairaExplicitSemanticAuthorityContracts.test.ts`.
- The semantic parser correctly distinguishes `stopQuestions` from `stopTalking`: a request such as `soru sorma artık` suppresses question generation while leaving the conversation open.
- The audit found a real explicit-command leak for `stopTalking`: messages such as `sus artık` were recognized and already disabled humor/questions and shortened the response, but `continueConversation` could remain `true` under strong approach/engagement signals.
- Fixed `behaviorIntegrationEngine.ts` narrowly: `continueConversation` is now false whenever `semanticEvent.stopTalking` is true. This does not force a persistent relationship disengage state; it only honors the explicit stop command at the integrated decision boundary.
- Targeted semantic/integration/cross-family contracts, TypeScript, full regression and production build all passed after the fix.
- Permanent product + contract commit: `38914b4` (`fix(kaira): honor explicit stop-talking command`).
- Temporary verification workflow and helper scripts were removed after the successful run.
- Next audit focus: value-vs-boundary overlap and repair reopening under competing warmth/goal/expression signals.


## 66. Value/boundary overlap + repair reopening authority — 2026-08-31
- Section 65'in açık kalan iki cross-family authority adayı birlikte kapatıldı: value-vs-boundary overlap ve repair reopening altında warmth/goal/preference/expression baskısı.
- Kalıcı `kairaValueBoundaryRepairAuthorityContracts.test.ts` eklendi.
- Aynı olay hem güçlü boundary hem güçlü value pressure ürettiğinde canonical öncelik sırası korunur: boundary gate aşılmışsa `boundary`, boundary gate aşılmamış fakat value gate aşılmışsa `values` seçilir. Value çatışması güçlü bir boundary kararını geri açamaz; boundary oluşmadığında ise değer katmanı bağımsız firm davranış otoritesi olarak kalır.
- `repairing` ilişki durumu altında maksimum affiliation/care/approach/engagement/humor ve tam repair openness verilse bile normal yakınlık anında geri açılmaz: humor ve soru kapalı, yanıt kısa, stance distant, distance en az 0.68 ve warmth en fazla 0.24 kalır.
- `disengaged` durumdan uygun apology/repair sinyaliyle geçiş yalnız repairing hold'a açılır; doğrudan normal warm ilişkiye sıçrama yoktur. Hard-stop boundary ise repair sinyalini ve alt katman sıcaklığını tamamen bloke eder.
- Bu auditte ürün kodu değişikliği gerekmedi; mevcut `behaviorIntegrationEngine` otorite semantiği beklenen contractları zaten sağlıyordu.
- Entegrasyon commit'i: `e156c47` (`test(kaira): lock value boundary repair authority`). Normal CI architecture contracts, full tests, TypeScript ve production build ile tamamen yeşil geçti.
- Repo açık issue taşımıyor ve TODO code search'te açık kayıt bulunmadı. Section 65'te kayıtlı mevcut cross-family authority audit dalının bilinen açık işleri bu bölümle tamamlandı.


## 67. Focused dialogue social-permission intersection + emotional question parity — 2026-08-31
- Gerçek konuşma baseline auditinde `DialogueDecisionPlan` ile final `KairaResponsePlan` arasında iki otorite kaçağı bulundu ve kapatıldı.
- `invite_emotional_context`, `grounded_recall`, `repair_or_rephrase`, `follow_previous_answer` ve `acknowledge_correction` odaklı hamleleri artık active/permissive BehaviorContract altında bile yeni sosyal anlam üretemez: humor, affection, forgiveness ve reopening-closeness izinleri final ResponsePlan'da daraltılır. Speech identity HOW-only kalır ve bu izinleri açamaz/kapatamaz.
- İlk duygusal açılışta ikinci kaçak AI/local parity sınırındaydı: BehaviorContract/ResponsePlan soru iznini kapattığında Yerel Dil Motoru kısa kabul tepkisine (`hmm`, `anladım`, `hee`) düşerken AI dialogue validator ve fallback hâlâ merak sorusu (`hmm niye`) zorluyordu.
- `DialogueOutputStyle.allowQuestion` effective final izin olarak dialogue validator'a taşındı. `invite_emotional_context` validasyonu soru açıksa minimal curiosity, soru kapalıysa minimal acknowledgement kabul eder. Grounded fallback da aynı effective izne göre `hmm niye` veya `hmm` üretir.
- `server.ts` AI validation/fallback seam'i final `responsePlan.allowQuestion` değerini kullanır; böylece local ve AI aynı WHAT/WHETHER otoritesine bağlandı.
- Kalıcı regression coverage: `kairaResponsePlan.test.ts` ve yeni `kairaEmotionalQuestionPermissionContracts.test.ts`.
- İlgili commitler: `eddec110` (focused social permission narrowing), `728e346` (focused permission tests), `a8d1ed85` (effective emotional question permission), `14ba9827` (parity contract), final server entegrasyonu `780f997` (`fix(kaira): align emotional question permission seam`).
- One-time entegrasyon run'ında targeted 10/10 test, full regression 657/657 test, TypeScript ve production build başarıyla geçti. Geçici workflow entegrasyon commit'inde silindi.
- Sonraki baseline audit adayı: `buildDialogueDecisionInstruction(...)` final ResponsePlan oluşmadan hazırlanıyor. Dialogue plan soru iznine izin verirken final ResponsePlan bunu kapatırsa model prompt'una çelişkili takip-sorusu talimatı yazılıp yazılmadığı koddan doğrulanacak; validator düzeldi diye prompt contradiction varsayılmayacak.


## 68. Explicit semantic stop → final ResponsePlan authority — 2026-08-31
- Baseline audit, section 65'teki `stopTalking` fix'inin final server WHAT/WHETHER sınırına kadar taşınmadığını ortaya çıkardı. Client `behaviorIntegrationEngine` `sus artık` için `continueConversation=false` üretiyordu; ancak bu komut bilinçli olarak persistent relationship `disengaged` state'ine yazılmadığı için server `BehaviorContract` yalnız dynamic state'ten yeniden `continueConversation=true` üretebiliyordu.
- Fix canonical server semantiğinde yapıldı: `buildBehaviorContract(...)` artık optional canonical `SemanticEvent` stop facet'lerini (`stopTalking`, `stopQuestions`) transient daraltıcı girdi olarak alır. Client behavior-policy bu final izin için güven kaynağı yapılmadı.
- `stopTalking=true` aktif ilişkiyi persistent disengaged yapmaz; contract `conversationState=active` kalırken yalnız mevcut tur için `continueConversation=false`, questions/playfulness/affection/reopening forbidden, forgiveness false, stance closed ve short response üretir. Böylece sonraki tur ilişki state'i gereksiz kalıcı kapanmaya uğramaz.
- `stopQuestions=true` ise aktif konuşmayı açık bırakır ve yalnız questions iznini forbidden yapar.
- `server.ts` canonical `canonicalSemantic.event` nesnesini BehaviorContract'a taşır; `KairaResponsePlan` final tek WHAT/WHETHER otoritesi olarak aynı contract'tan türemeye devam eder.
- Kalıcı regression contract: `kairaExplicitSemanticResponsePlanAuthorityContracts.test.ts`. `sus artık` ve `soru sorma artık` için contract→plan semantiğini ve server canonical seam'ini kilitler.
- İlgili commitler: `35d92a4` (canonical semantic event server seam), `e007578` (BehaviorContract transient stop semantics), `5fc0a1d` (permanent regression contract).
- CI #1028 architecture contracts, full tests, TypeScript ve production build adımlarının tamamında başarıyla geçti.
- Sonraki audit odağı: explicit semantic command'ların final delivery fallback/enforcer zincirinde de aynı transient contract'ı koruduğunu gerçek cevap örnekleriyle doğrulamak; özellikle `stopTalking` için fallback'in yeni soru, mizah veya yeniden yakınlaşma üretmediğini kilitlemek.


## 69. Explicit semantic final-delivery fallback semantics — 2026-08-31
- Section 68 sonrasında explicit semantic stop izinleri deterministic final-delivery/enforcer zincirinde ayrıca audit edildi.
- Gerçek bir semantik kaçak bulundu: `stopQuestions=true` ve `continueConversation=true` iken model cevabı tamamen soru cümlesiyse `enforceKairoResponse(...)` soru cümlesini sildikten sonra boş metni genel hard-close fallback'i olan `bu şekilde devam etmeyeceğim` ile dolduruyordu. Böylece yalnız `soru sorma` talebi yanlışlıkla `konuşmayı kes` anlamına dönüşebiliyordu.
- `kairoResponseConsistency.ts` question-block fallback'i transient izin semantiğine ayrıldı: konuşma açıksa boş kalan question-only cevap `tamam` minimal acknowledgement'ına düşer; konuşma gerçekten kapalıysa mevcut boundary fallback korunur.
- `stopTalking` final delivery'de hard-closed kalır: soru, mizah, emoji veya reopening adayı deterministic enforcement tarafından kapatılır ve canonical ResponsePlan ile çelişemez.
- Kalıcı regression: `kairaExplicitSemanticFinalDeliveryContracts.test.ts`. `soru sorma artık` için conversation-open/question-forbidden davranışını ve `sus artık` için final hard-close davranışını kilitler.
- Ürün fix commit'i: `911d325` (`fix(kaira): keep question suppression conversation-open`). Kalıcı test commit'i: `c32079b` (`test(kaira): lock explicit semantic final delivery`).
- CI #1032 architecture contracts, full tests, TypeScript ve production build adımlarının tamamında başarıyla geçti.
- Başarısız ilk one-time helper ürün kodunu değiştirmedi; sadeleştirilmiş migration başarıyla uygulandı ve helper dosyası entegrasyon commit'inde kaldırıldı.

## 70. Explicit stop facets preserve primary intent — 2026-08-31
- Transient `stopQuestions` / `stopTalking` facet'lerinin birleşik mesajlarda primary intent'i ezdiği semantik precedence alanı audit edildi.
- `moralim bozuk, soru sorma artık` gibi mesajlarda emotional-share primary intent korunur; stop facet yalnız soru iznini daraltır. `moralim bozuk, sus artık` da emotional content'i korurken current-turn konuşma iznini kapatır.
- `soru sorma` ifadesi artık kendi başına `frustration` üretmez. Gerçek bıkkınlık/sinir ifadeleri (`yeter`, `bıktım`, `sinir`, `kaç kere`, vb.) frustration kaynağı olmaya devam eder.
- Standalone `soru sorma artık` ve `sus artık` backward-compatible olarak `complaint` intent + negative valence taşır; negatiflik stop facet'ten gelir, sahte frustration'dan değil.
- Böylece `naber kaira, soru sorma artık` primary `greeting` olarak kalabilir; transient stop facet ayrıca taşınır.
- `kairaExplicitStopIntentFacetContracts.test.ts` standalone stop, emotional-share + stopQuestions, emotional-share + stopTalking ve greeting + stopQuestions kombinasyonlarını kilitler. Dialogue testinde canonical `planDialogueResponse(...)` kullanılır.
- İlgili commitler: `3730e49` (stop facet'i primary complaint precedence'ından ayırma), `1a97b14` (stop ifadelerini frustration regex'inden çıkarma), `f77991a` (canonical planner contract düzeltmesi), `eeb8047` (negative valence'ı frustration'dan bağımsız koruma).
- CI #1040 architecture contracts, full test suite (675/675), TypeScript ve production build adımlarının tamamında başarıyla geçti.
- Sonraki baseline audit odağı: transient explicit command'ların Local Language Engine erken dönüşü, AI path, repair/fallback ve post-enforcement yollarındaki parity'sini toplu gerçek mesaj matrisiyle kilitlemek; özellikle stop facet + emotional-opening/confusion/correction kombinasyonlarında local ve AI'nın aynı final ResponsePlan semantiğini koruduğunu doğrulamak.


## 71. Transient explicit-stop local / AI path parity — 2026-08-31
- Section 70 sonrasında transient stop facet'lerinin gerçek response-path seçimi boyunca aynı final ResponsePlan semantiğini koruyup korumadığı gerçek fonksiyonlarla audit edildi.
- Kalıcı `kairaTransientStopPathParityContracts.test.ts` beş çapraz senaryoyu kilitler: emotional-opening + stopQuestions, emotional-opening + stopTalking, greeting + stopQuestions, confusion + stopQuestions ve correction + stopQuestions.
- Emotional-opening + stopQuestions local-language yolunda kalabilir ancak final `responsePlan.allowQuestion=false` nedeniyle soru üretemez; local cevap final ResponsePlan validator'ından temiz geçer.
- Emotional-opening + stopTalking local erken dönüş tarafından yeniden açılamaz. Local verbalizer `continueConversation=false` planını görünce `handled=false` ile AI yoluna bırakır; deterministic final delivery de soru/mizah/emoji reopening adayını hard-close cevaba indirger.
- Greeting + stopQuestions locally cevaplanabilir fakat soru izni yeniden açılamaz. Confusion ve correction kombinasyonları local intent değildir; AI repair/correction yolunda kalırken final soru izni forbidden olarak taşınır.
- Bu auditte ürün kodu değişikliği gerekmedi; mevcut local verbalizer + ResponsePlan + final enforcement zinciri beklenen parity'yi zaten sağlıyordu.
- Kalıcı contract commit'i: `893b1ed` (`test(kaira): lock transient stop path parity`). CI #1043 architecture contracts, full tests, TypeScript ve production build adımlarının tamamında başarıyla geçti.

## 72. Dialogue prompt uses final ResponsePlan authority — 2026-08-31
- Section 67'de açık bırakılan prompt contradiction adayı kapatıldı. `buildDialogueDecisionInstruction(...)` çağrısı final `KairaResponsePlan` oluşturulduktan sonra yapılır ve lower-layer DialogueDecisionPlan'ın ham izin/bütçeleri yerine `responsePlan.allowQuestion`, `responsePlan.maxSentences` ve `responsePlan.maxWords` değerlerini alır.
- Böylece alt diyalog planı takip sorusuna izin verse bile final ResponsePlan soruyu kapatmışsa model prompt'unda `Takip sorusu: yasak` yazılır. Emotional-opening için gerekçe de soru kapalı olduğunda minimal acknowledgement semantiğine çevrilir.
- Final cümle ve kelime bütçeleri de prompt'a authoritative ResponsePlan değerlerinden yazılır; lower-layer daha uzun cevap istese bile prompt final bütçeyi aşmaya teşvik etmez.
- Kalıcı `kairaDialoguePromptAuthorityContracts.test.ts` hem instruction renderer semantiğini hem server call-order/seam invariant'ını kilitler.
- Ürün kodu değişikliği gerekmedi; prompt seam daha önce section 67 içindeki parity düzeltmeleri sırasında doğru hale gelmişti fakat kalıcı prompt-authority contract eksikti.
- Contract commit'i: `6da64d9` (`test(kaira): lock response-plan authority in dialogue prompt`). CI #1044 architecture contracts, full tests, TypeScript ve production build adımlarının tamamında başarıyla geçti.
- Bu noktada explicit-stop / question-permission audit dalında bilinen açık seam kalmadı: canonical SemanticEvent → BehaviorContract → ResponsePlan → dialogue prompt → local/AI path → fallback/enforcer zinciri kalıcı regression contractlarla kaplıdır.
- Sonraki baseline odağı explicit-stop özel durumundan çıkarak response consistency / doğal sosyal konuşma kalitesine dönmelidir: gereksiz uzunluk, persona gösterisi, tekrar, robotik yardımcı kalıpları ve Kaira'nın sabit yazışma ritminin gerçek mesaj matrisiyle ölçülmesi.


## 73. Natural social assistant-menu and artificial-persona guard — 2026-08-31
- Response consistency baseline, server system prompt'unda zaten bulunan doğal arkadaş dili kurallarının deterministic validator tarafından sahiplenilmediğini gösterdi. Model kısa cevap sınırında kalsa bile `istersen yardımcı olabilirim` gibi robotik assistant-menu dili veya kullanıcı açmadan CPU/log/sunucu persona gösterisi üretebiliyordu.
- `kairoDialogueDecisionEngine.findDialogueDecisionIssues(...)` sosyal-only hamlelerde robotik helper/menu kalıplarını reddeder. Bu guard gerçek yardım sorularındaki `answer_or_clarify` yoluna global yasak koymaz; sıradan `istersen sonra konuşuruz` gibi sosyal kullanımlar false-positive olarak işaretlenmez.
- Kullanıcının açmadığı CPU/işlemci/log/veri merkezi/sunucu/algoritma/kod/RAM persona gösterisi sosyal-only hamlelerde reddedilir. Kullanıcı altyapı konusunu kendisi açtıysa aynı kelime alanı serbesttir.
- Kalıcı regression: `kairaNaturalSocialConsistencyContracts.test.ts`.
- Ürün entegrasyon commit'i `93e7459`; false-positive contract commit'i `6e8f808`. CI #1049 architecture contracts, full tests, TypeScript ve production build ile tamamen yeşil geçti.

## 74. AI substantial exact-repeat response rhythm guard — 2026-08-31
- Local Language Memory daha önce recentReplies üzerinden exact repetition penalty uyguluyordu; AI response yolunda eşdeğer tekrar kontrolü yoktu.
- Yeni lightweight `kairoResponseRhythm.ts` son üç Kaira cevabında anlamlı uzunlukta exact tekrarı normalize edilmiş metin üzerinden yakalar. Noktalama/boşluk farkları normalize edilir; guard yalnız en az 4 kelimelik ve anlamlı uzunluktaki tekrarları işaretler.
- `tamam`, `aynen ya` gibi kısa gündelik acknowledgement tekrarları bilinçli olarak serbest bırakıldı.
- Rhythm issue AI ilk taslak, repair taslağı, grounded fallback, world-memory guard sonrası cevap ve plan-safe fallback validation zincirine bağlandı; böylece tekrar repair sebebi olur ve fallback de aynı quality contract'tan kaçarak geçemez.
- Kalıcı regression: `kairoResponseRhythm.test.ts` ve `kairaResponseRhythmIntegrationContracts.test.ts`.
- İlgili commitler: `aec37ca`, `b10e2bc`, server wiring `5212270`, integration contract `77d3220`. Son birleşik CI #1059 bu zinciri full regression içinde doğruladı.

## 75. Deterministic final ResponsePlan length budgets — 2026-08-31
- Final `KairaResponsePlan.maxSentences/maxWords` değerleri prompt, validator ve repair katmanlarında kullanılıyordu fakat deterministic delivery enforcer bu bütçeleri uygulamıyordu. Repair başarısız olursa aşırı uzun cevap consistency=false olarak işaretlenip yine kullanıcıya ulaşabiliyordu.
- `KairoResponseEnforcementRules` artık `maxSentences` ve `maxWords` taşır. Server bu iki değeri doğrudan final ResponsePlan'dan geçirir.
- `enforceKairoResponse(...)` generation/repair sonrasında cümle bütçesini deterministic olarak keser (`sentence_budget_enforced`) ve ardından kelime bütçesini uygular (`word_budget_enforced`). Böylece uzunluk artık yalnız gözlem/validator metriği değil final delivery kuralıdır.
- Kalıcı regression: genişletilmiş `kairoResponseConsistency.enforcement.test.ts` ve yeni `kairaResponseBudgetEnforcementContracts.test.ts`.
- İlgili commitler: integration `4a1a8b2`, enforcement tests `caf5b0f`, server authority contract `2234564`. Son birleşik CI #1059 tüm zinciri doğruladı.

## 76. Natural social message matrix baseline — 2026-08-31
- Doğal sosyal kalite ayarlarının ileride planner semantiğini sessizce kaydırmaması için gerçek gündelik mesaj matrisi kalıcı contract'a alındı.
- `ben öğrenciyim` ve `bugün iş çok yoğundu` compact `natural_reaction` yolunda kalır; otomatik takip sorusu açılmaz ve cevap bütçesi kısa tutulur.
- Kullanıcının başlattığı `yine son dakikaya bıraktım hahaha` kısa `join_banter` yolunda kalır. `hiç havamda değilim` minimal `invite_emotional_context` yolunda kalır. Kaira'nın hemen önceki sorusuna `hiçbiri` gibi kısa cevap ise yeni konu sayılmaz, `follow_previous_answer` olarak devam eder.
- Kalıcı regression: `kairaNaturalSocialMessageMatrixContracts.test.ts`, commit `783ef69`.
- CI #1059 architecture contracts, full tests, TypeScript ve production build adımlarının tamamında başarıyla geçti. Bu nokta doğal sosyal response-consistency baseline'ının ilk ölçülebilir sürümüdür.
- Sonraki audit odağı: doğal-sosyal validator bir taslağı assistant-menu/persona/repetition nedeniyle reddettiğinde repair başarısızsa final delivery'nin invalid ilk taslağı yine kullanıcıya geçirip geçirmediğini ve quality rejection için güvenli fakat semantik olarak dar bir fallback gerekip gerekmediğini koddan doğrulamak.


## 77. Safe final fallback for rejected natural social drafts — 2026-08-31
- Natural-social validator bir `natural_reaction` taslağını assistant-menu, unsolicited persona veya rhythm problemi nedeniyle reddedip model repair başarısız olduğunda `buildGroundedDialogueFallback(...)` daha önce null dönebiliyordu. Böylece invalid ilk taslak consistency=false etiketiyle teslim edilebiliyordu.
- `natural_reaction` için deterministic, semantik olarak dar fallback `he anladım` eklendi. Bu fallback soru, mizah, yeni olay, persona veya yakınlık anlamı eklemez ve yalnız daha iyi geçerli taslak üretilemediğinde kullanılır.
- Kalıcı regression `kairaPostEnforcementResponsePlanContracts.test.ts` içinde fallback'in dialogue-quality kurallarından temiz geçtiğini doğrular.
- İlgili commitler: integration `a8e14ec`, regression `514f554`. Son birleşik CI #1072 tüm zinciri doğruladı.

## 78. Response rhythm guard scoped to social dialogue moves — 2026-08-31
- Exact-repeat rhythm guard ilk sürümde tüm AI yollarında çalışıyordu. Bu, kullanıcı aynı factual soruyu tekrar sorduğunda değişmemiş doğru cevabın veya aynı grounded recall'ın tekrar verilmesini gereksiz quality hatasına çevirebilirdi.
- `findKairoResponseRhythmIssues(...)` artık canonical `DialogueMove` alır ve yalnız rhythm-sensitive sosyal hamlelerde çalışır: natural reaction, banter, previous-answer continuation, emotional opening, correction acknowledgement, repair/rephrase ve topic shift.
- `answer_or_clarify` ve `grounded_recall` aynı doğru içeriği tekrar edebilir; doğruluk writing-rhythm uğruna cezalandırılmaz.
- Server ilk taslak/repair/fallback/world-guard/plan-safe fallback seam'lerinin tamamında `dialogueDecision.move` geçirir.
- İlgili commitler: scope `841ea37`, server wiring `1e5a39`, factual/recall regression `d0543b8`, integration contract update `8f6b246`. Son birleşik CI #1072 doğruladı.

## 79. Topic-shift social quality coverage — 2026-08-31
- `follow_topic_shift` sosyal bir hamle olmasına rağmen assistant-menu/persona quality setinin dışında kalıyordu ve repair başarısızlığında grounded fallback'i yoktu.
- Topic shift artık social-only quality guard kapsamındadır. Robotik yardımcı dili ve kullanıcı açmadan yapılan artificial-persona gösterisi burada da reddedilir.
- Repair geçerli cevap üretemezse deterministic dar fallback `he tamam` kullanılır; yeni konuya dair uydurma ayrıntı, soru veya persona anlamı eklenmez.
- Ürün entegrasyon commit'i `54154ba`; kalıcı regression `kairaNaturalSocialConsistencyContracts.test.ts`, commit `9fe841c`.
- CI #1072 architecture contracts, full tests, TypeScript ve production build adımlarının tamamında başarıyla geçti.
- Sonraki gelişim sorusu koddan yeniden doğrulandı: mevcut ilişki motoru aynı olumsuz olayı farklı ilişki geçmişlerinde tolerans, hasar şiddeti, conversationState ve ton açısından farklılaştırıyor; ancak kişi/ilişki bağlamından açık bir nitel reaction mode (ör. öfkelenme vs küsme/withdrawal) seçen ayrı canonical kavram henüz yok. Bu hedef ayrı characterization + design adımı olarak ele alınmalı.


## 80. Relationship injury tolerance completed — 2026-08-31
- Healthy established relationships now reduce ordinary relationship injury as well as warmth/trust impact.
- Severe boundary events retain a hard injury floor and disengagement behavior.
- CI #1078 passed all validation stages.

## 81. Canonical affective reaction mode — 2026-08-31
- Added canonical modes: neutral, irritated, hurt, withdrawn, repairing.
- KDM owns the appraisal and stores it in dynamic state and reasoning trace.
- Relationship context can now change the qualitative HOW state for the same negative event.
- BehaviorContract remains the only authorization/permission authority.
- CI #1083 passed all validation stages.

## 82. Reaction-mode AI prompt seam — 2026-08-31
- The canonical reaction directive is now included in relationshipInstruction, which is already injected by server.ts into the AI system prompt.
- This exposes qualitative HOW to AI without creating a second prompt authority.
- CI #1086 passed all validation stages.

## 83. Reaction-mode local-language parity — 2026-08-31
- Local language now consumes canonical reactionMode instead of relying only on numeric hurt/anger thresholds.
- hurt/withdrawn remain reserved; repairing stays cautious; irritated contributes to firm local HOW.
- Language-memory choice context now includes reactionMode.
- CI #1088 passed all validation stages.

### Next verified development question
- Verify KNT/debug observability and multi-turn persistence of reactionMode across follow-up neutral/social messages.


## 84. Reaction-mode TestLab observability — 2026-08-31
- TestLab now projects canonical reactionMode from backend dynamic state / reasoning trace into the diagnostic snapshot.
- Current-state debug UI explicitly shows Tepki: <mode>.
- TestLab uses canonical AffectiveReactionMode instead of a local string type.
- Observability contracts lock persistence projection, UI visibility and canonical type usage.

## 85. Multi-turn qualitative reaction continuity — 2026-08-31
- hurt and irritated no longer disappear on the first unrelated neutral turn while measurable relationship injury remains.
- Neutral turns gradually heal conflict and hurt, so low-level qualitative reactions eventually decay back to neutral instead of becoming permanent flags.
- Characterization covers first-neutral-turn persistence and eventual decay.

## 86. Integer-resolution healing correction — 2026-08-31
- KDM state clamp rounds values to whole numbers. The first neutral healing formula could subtract less than one point and therefore fail to advance after rounding.
- Neutral hurt healing now advances by at least one state point, keeping decay compatible with the canonical integer state resolution.

## 87. Reaction/lifecycle hydration preservation — 2026-08-31
- Dynamic-state normalization now preserves reactionMode across persistence and session restore.
- Relationship lifecycle normalization also preserves conversationState, disengagedAt, disengageReason and repairAttempts so reload cannot silently weaken disengaged/repairing state.
- Hydration regression locks all canonical reaction and relationship lifecycle fields.
- Final combined CI #1102 passed architecture contracts, all tests, TypeScript and production build.

### Next verified development question
- Audit response-consistency enforcement for qualitative HOW: ensure generated replies cannot contradict hurt/irritated/withdrawn/repairing state even when permissions remain otherwise valid.


## 88. Qualitative reaction response consistency — 2026-08-31
- Response consistency now evaluates canonical reactionMode in addition to numeric relationship damage.
- Low-score hurt/irritated states can therefore reject replies that reopen excessive familiarity, humor or premature closure even when old hurt/conflict thresholds are not crossed.
- withdrawn also rejects active social reopening language; repairing rejects premature forgiveness/return-to-normal language.
- neutral mode does not inherit these qualitative restrictions.
- Regression covers hurt, irritated, withdrawn, repairing and neutral cases.

## 89. Qualitative reaction repair wiring — 2026-08-31
- The qualitative HOW issue is routed into the existing AI repair issue list before delivery and after world-response guard rewriting.
- This is intentionally scoped to the qualitative reaction issue; the entire response validator was not promoted into a new behavior authority.
- BehaviorContract remains the permission authority while reaction consistency remains a HOW repair signal.
- Integration contracts lock the server repair seam.
- Combined CI #1110 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Verify repair-failure final delivery: if the model still violates qualitative reaction HOW after repair attempts, ensure the invalid draft cannot be delivered unchanged.


## 90. Qualitative reaction final delivery enforcement — 2026-08-31
- Qualitative reaction HOW is now enforced at final delivery after BehaviorContract enforcement.
- If model repair still leaves over-familiar humor, premature repair closure or withdrawn-state reopening language, deterministic delivery removes only the conflicting HOW surface while preserving factual content.
- If removing the conflicting surface empties the reply, a narrow reaction-specific fallback is used.
- Repaired AI candidates and grounded fallback candidates are revalidated with the same qualitative reaction check before replacement decisions.
- CI #1116 passed architecture contracts, full tests, TypeScript and production build.

## 91. Stateful 20-turn conversation regression and cleanup — 2026-08-31
- Added a real 20-turn regression that feeds every turn from the prior turn's nextDynamicState rather than reconstructing or repeating the final state.
- The regression locks historical snapshot immutability, per-turn relationship-state variation, monotonic interaction history, insult-to-neutral qualitative reaction continuity and later repair movement.
- CI #1117 passed architecture contracts, full tests, TypeScript and production build.
- Final workflow audit found only the permanent ci.yml workflow; no one-time workflow remains.
- TODO code search and open issue audit returned no active entries.
- The current architecture/audit + world reasoning + qualitative reaction + response-consistency hardening package is complete.

### Next development phase
- Move from baseline hardening to higher-level product behavior validation: long-session natural-language quality, speech-identity fingerprint quality, persistent language-memory learning and eventually controlled spontaneity.


## 92. Social speech fingerprint drift guard — 2026-08-31
- Social rhythm validation now rejects generic/formal assistant wording and list/report formatting on rhythm-sensitive social moves.
- Factual answer_or_clarify moves are excluded so the HOW guard does not interfere with information correctness.
- Existing meaningful exact-repeat detection remains active.
- CI #1121 passed architecture contracts, full tests, TypeScript and production build.

## 93. Accepted AI language-memory learning — 2026-08-31
- Final AI replies now feed language-memory only when persistentUserMemory is enabled and final consistency accepted the delivered reply.
- Rejected/repair-stage drafts are not learned.
- Local-language replies keep their existing single learning path; the server does not double-count them.
- Unit contracts verify learned phrase affinity, candidate preference change and bounded recent-reply memory.
- CI #1125 passed architecture contracts, full tests, TypeScript and production build.

## 94. Long-session local natural-language quality — 2026-08-31
- Added a 20-turn local social conversation regression across greeting, how-are-you, what-doing, thanks, agreement, good-night and goodbye routines.
- The regression requires every turn to remain local, short and free of generic-assistant/list drift while maintaining practical reply diversity and bounded repetition.
- CI #1126 passed architecture contracts, full tests, TypeScript and production build.

### Next development phase
- Baseline now permits implementation of controlled spontaneity at behavior-choice level. Spontaneity must never override ResponsePlan/BehaviorContract permissions and every random choice must be observable/persisted as an actual event.


## 95. Controlled spontaneity behavior-choice core — 2026-08-31
- Added a lower-authority controlled spontaneity choice layer for open, neutral natural_reaction turns only.
- The first mode is recent_topic_nudge and may reference only a safe, already-spoken recent user topic. It cannot invent events, memories, plans or unsupported details.
- Selection probability is relationship-aware and deliberately low: close 0.12, familiar 0.07, new 0.03.
- Factual/question moves, non-open conversations, active qualitative reaction states and insufficient response budgets are hard-ineligible.
- The instruction explicitly cannot grant permissions that ResponsePlan/BehaviorContract denied.
- CI #1130 passed architecture contracts, full tests, TypeScript and production build for the core behavior-choice engine.

## 96. Controlled spontaneity server integration and observability — 2026-08-31
- Server decides spontaneity only after canonical ResponsePlan construction and composes its instruction beneath the ResponsePlan instruction.
- Local-language short-circuit explicitly records mode=none; AI turns retain the full decision including eligible, probability, roll, sourceText/sourceParticipant and reason.
- The decision is persisted in KNT traces, stored in test-session metadata, returned in the API KDM payload and projected through droitChatService.
- Canonical persistence metadata types include controlledSpontaneity, preventing TypeScript drift.
- CI #1143 passed architecture contracts, full tests, TypeScript and production build on the final integrated/observable main state.

### Next verified development question
- Measure controlled spontaneity in multi-turn simulations for frequency, duplicate-topic pressure and permission-boundary preservation before adding any new spontaneity mode.


## 97. Controlled spontaneity frequency and topic-pressure quality — 2026-08-31
- Deterministic 100-roll quality regression locks configured selection rates exactly at close 12/100, familiar 7/100 and new 3/100.
- Permission boundaries remain absolute across stress rolls: closed conversation and active irritated/hurt/withdrawn/repairing reaction states never select spontaneity.
- A safe prior topic already echoed in recent Kaira replies is excluded from immediate reuse; selection falls back to another safe prior user topic when available.
- CI #1147 passed architecture contracts, full tests, TypeScript and production build.

## 98. Language-memory canonical phrase and repetition normalization — 2026-08-31
- Learned phrase keys and affinity/repetition lookup now share one canonical reply normalizer.
- Punctuation variants such as `he tamam kanka!` and `he tamam kanka` no longer split phrase learning or bypass recent-reply repetition pressure.
- CI #1148 passed architecture contracts, full tests, TypeScript and production build.

## 99. Language-memory reload/hydration preservation — 2026-08-31
- Added a regression that learns replies, flushes the persistence timer, resets the imported module to simulate a cold process/module reload, then hydrates from mocked Firestore.
- Before hydration the fresh runtime has neutral in-memory state; after hydration the persisted interactionCount and learned phrase affinity are restored.
- The hydration regression also proves canonical punctuation variants retain the same learned affinity after reload.
- CI #1149 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Measure the local-language intent boundary on a larger typo/natural-social-message matrix: false positives, false negatives and near-neighbor intent collisions must be characterized before widening the local intent catalog.


## 100. Local-language typo and near-neighbor intent boundary — 2026-08-31
- The local engine now uses the existing canonical language normalizer as a guarded fallback when raw SemanticEvent does not already resolve a social routine.
- Canonical fallback is allowed only for general/greeting, discourse-neutral, non-advice, non-insult, non-repair, non-stop, non-coercive and non-emotional raw events with sufficient normalization confidence.
- Regression covers 17 positive colloquial/typo forms including slm/sa/mrb/nbr/napyon/sagol/tsk/gorusuruz/ii geceler and addressed variants.
- A negative near-neighbor matrix proves richer advice, information, complaint, recall, stop-question, stop-talking and repair semantics remain on the AI path even when they contain a normalizable routine token.
- CI #1153 passed architecture contracts, full tests, TypeScript and production build.

## 101. Same-intent local reply diversity and recency separation — 2026-08-31
- Language style affinity and repetition pressure are now separate concepts. languageAffinity measures learned style only; chooseLanguageReply applies recency-weighted repetition pressure at selection time.
- Exact phrase contribution is bounded so repeatedly accepted wording can influence style without creating unlimited self-reinforcing exact-phrase dominance.
- Recent reply pressure is strongest for the immediately previous canonical reply and decays across the bounded recent-reply window.
- Learning contracts now verify style affinity growth, learned preference when recency pressure is absent, and immediate-repeat avoidance when it is present.
- A 15-turn repeated-naber local regression requires at least four distinct replies and no consecutive exact duplicate.
- CI #1156 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Verify HOW differentiation across relationship levels: for the same safe social intent and same canonical WHAT, new/familiar/close users should produce observably distinct warmth/slang/directness surfaces without changing permissions or semantic intent.


## 102. Relationship-level HOW differentiation and local/AI parity — 2026-08-31
- SpeechIdentity remains the single relationship-level HOW source. KairaResponsePlan copies speech.relationshipLevel directly; server gives the same canonical plan to both local and AI response paths. No second relationship-level authority was found.
- The local how_are_you and what_doing verbalizer pools now gate relaxed/slang wording by relationship level instead of letting high humor make new users sound familiar.
- New relationships stay measured; familiar relationships may use light ya/be-style casualness; close relationships may naturally surface kanka-level closeness.
- The same differentiation is preserved when allowQuestion=false: question/follow-up permission remains blocked while relationship HOW remains distinct.
- Permanent regression verifies SpeechIdentity slang/warmth ordering new < familiar < close and local surface differentiation under both question-allowed and question-blocked plans.
- Product commits: 959d8a0 and e36e8eb; final regression commit d76c6df. CI #1162 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Bound persistent language-memory growth: recentReplies is bounded but wordWeights and phraseWeights currently accumulate keys indefinitely, so long-lived accepted AI/local learning may eventually bloat the Firestore document.


## 103. Bounded persistent language-memory storage — 2026-08-31
- Persistent language-memory growth is now structurally bounded: wordWeights <= 128 keys, phraseWeights <= 64 keys and recentReplies remains <= 8.
- Base Kaira style words are pinned; higher-weight learned entries survive churn while one-off low-weight content is naturally displaced.
- Hydration sanitizes oversized/legacy maps, removes non-finite and negative weights, clamps weight ranges and restores bounded canonical state.
- Persistence uses document replacement rather than merge semantics so pruned nested map keys are physically removed from Firestore instead of lingering indefinitely.
- Stress regressions cover 300 unique learned replies, retention of a repeatedly learned phrase through churn, oversized legacy hydration, invalid values and replacement-write call shape.
- Product commits: f465024 and 47dea58; final regression commit 51081be. CI #1169 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Close the learned-language HOW loop for AI responses: accepted AI/local replies currently train the bounded language-memory used by local selection, but the AI system prompt does not consume a safe derived language-style memory signal.


## 104. Learned language HOW loop and reply-level evidence — 2026-08-31
- Persistent language-memory exposes a safe derived HOW-only signal to the AI path without replaying raw prior replies, topics or memories.
- The derived signal contains only maturity, bounded preferred discourse markers and recent average response length. ResponsePlan permissions and SpeechIdentity relationship/register limits remain higher authority.
- Learned marker evidence is reply-level: repeating the same marker multiple times inside one accepted reply counts as one evidence step; learned preference requires evidence across separate accepted replies.
- Canonical language-style observability remains available in KNT/test-session metadata.
- CI #1179 and #1181 passed architecture contracts, full tests, TypeScript and production build.

## 105. Bounded self-reinforcing language drift — 2026-08-31
- Learned word growth is capped relative to each word's base weight with MAX_LEARNED_WORD_DELTA=2.1, preventing accepted self-generated replies from amplifying a marker without bound.
- Recency penalties remain separate from learned style affinity, so style can stabilize without forcing immediate exact-repeat loops.
- A deterministic 200-turn self-training regression verifies at least four distinct responses survive, consecutive exact duplicates stay at zero and the most frequent candidate remains at or below 45 percent of the run.
- Core self-reinforcement CI #1183 and the long-run selection regression both passed architecture contracts, full tests, TypeScript and production build.

## 106. Learned style stays below relationship HOW authority — 2026-08-31
- SpeechIdentity remains the canonical relationship HOW source. Learned language style cannot reopen a closeness surface that current relationship state does not permit.
- In rhythm-sensitive social moves, kanka is a close-only address surface: new/familiar levels route it into the existing repair chain, while close relationships may use it naturally.
- Factual/non-social moves remain exempt so quoted or explanatory uses are not blocked.
- The canonical speech.relationshipLevel is passed through all five AI rhythm validation seams: initial draft, repaired draft, grounded fallback, world-guard revised reply and plan-safe fallback.
- Final CI #1189 passed architecture contracts, 825/825 tests, TypeScript and production build.

## 107. Stale close-style memory cannot override current relationship context — 2026-08-31
- Added an explicit context-change regression that heavily trains the same language-memory profile with close-style kanka replies, then evaluates local natural social replies under a current new relationship state and new ResponsePlan relationship level.
- The stale close-style memory does not leak kanka back into the new-relationship local response pool; current relationship HOW remains authoritative over learned historical preference.
- CI #1191 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Audit whether persistent phrase/word evidence needs time/context decay beyond existing key bounds, self-reinforcement caps and recency pressure. Add decay only if deterministic long-horizon simulations show stale learned preferences measurably dominating current safe candidate selection.


## 108. Final-delivery language-memory learning boundary — 2026-08-31
- Local-language selection no longer mutates language-memory inside the local verbalizer before final enforcement.
- Local and AI paths now share the same learning authority boundary: only the final delivered reply is learned, only when final consistency accepts it and persistentUserMemory is enabled.
- Rejected or rewritten local drafts cannot contaminate persistent style memory.
- CI #1204 passed architecture contracts, full tests, TypeScript and production build.

## 109. Persistent-user-memory read/write/debug boundary — 2026-08-31
- persistentUserMemory=false now disables both learned-memory writes and learned-memory reads.
- Hydration, local learned selection, AI learned-style prompt injection and final learning are all gated by the instance policy.
- Stale learned profiles already present in RAM cannot influence a memory-disabled instance.
- The /api/kaira/language-memory diagnostic endpoint also respects the policy and cannot hydrate or expose an old learned profile while memory is disabled.
- Final CI #1215 passed architecture contracts, full tests, TypeScript and production build.

## 110. Language-memory user + Kaira-instance isolation — 2026-08-31
- Persistent language style is intentionally scoped to user + Kaira instance, not to an individual chat session.
- The same user with the same Kaira keeps learned style across new sessions; another Kaira instance does not inherit it.
- Different users remain isolated even when they talk to the same Kaira instance.
- The reference Kaira preserves the legacy user-only storage key for backward compatibility.
- CI #1216 passed architecture contracts, full tests, TypeScript and production build.

## 111. Evidence-driven stale-style adaptation — 2026-08-31
- Long-lived learned word evidence can now adapt when later accepted replies consistently stop using an old style marker.
- Decay is evidence-driven rather than wall-clock driven: idle time alone does not erase style; new accepted behavior supplies contrary evidence.
- Base Kaira identity weights never decay below their canonical baseline. Only learned excess can move back toward base.
- A three-recent-reply grace window prevents temporary wording changes from immediately erasing an established marker; sustained absence gradually removes stale learned preference.
- Exact phrase memory remains bounded but is not blindly decayed, preserving existing phrase-retention and repetition contracts.
- Regression verifies marker adaptation, base identity preservation and stale-affinity reduction.
- Final CI #1220 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Verify response-length adaptation separately. languageStyleMemorySignal derives averageWords from the bounded recentReplies window, so old long/short style should naturally turn over without a second decay mechanism. Add a regression first; patch only if the characterization fails.


## 112. Learned response-length turnover — 2026-08-31
- Response-length preference already adapts through the bounded recentReplies window; no second decay mechanism was required.
- Eight recent accepted replies fully turn over the length evidence window in either direction.
- Regression verifies medium -> very_short and very_short -> medium transitions after sustained recent behavior changes.
- No product-code patch was required; CI #1223 passed architecture contracts, full tests, TypeScript and production build.

## 113. Stale exact-phrase selection freshness — 2026-08-31
- Persistent phraseWeights remain bounded long-term evidence and are not destructively erased during style adaptation.
- Exact-phrase contribution to candidate affinity is now freshness-weighted at selection time.
- A phrase present in recentReplies keeps full learned contribution; after many accepted different replies, its selection bonus exponentially discounts even though the persistent historical phrase record remains.
- This closes a measured failure where an isolated historically trained phrase monopolized 100/100 later candidate selections after a sustained style change.
- The regression isolates exact-phrase pressure from base Kaira identity weights, so canonical base identity is not weakened to solve stale phrase learning.
- Final CI #1226 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Verify stale phrase freshness across cold process reload/hydration. The selection freshness must be reproducible from persisted interactionCount, phraseWeights and recentReplies without new hidden state.


## 114. Cold-reload stale-phrase freshness parity — 2026-08-31
- Stale exact-phrase selection freshness is fully reconstructible from persisted canonical state: interactionCount, phraseWeights and recentReplies.
- A cold module/process reload followed by Firestore hydration reproduces the exact same deterministic candidate selections for the same seeds.
- No hidden in-memory freshness counter or session-only state is required.
- Regression trains a phrase, shifts style for many accepted turns, verifies stale selection pressure is bounded, persists, reloads, hydrates, then requires 50/50 deterministic selection parity with the pre-reload runtime.
- CI #1229 passed architecture contracts, full tests, TypeScript and production build.

### Language-memory long-horizon phase status
- The current package is closed across final-delivery learning authority, memory on/off policy, user+instance isolation, bounded persistence, self-drift caps, evidence-driven marker adaptation, response-length turnover, stale exact-phrase freshness and cold-reload parity.
- Further language-memory changes should require a newly measured failure rather than speculative tuning.

## 115. Canonical 20-turn mixed-conversation quality regression — 2026-09-01
- A single deterministic 20-turn conversation now exercises local/AI routing, canonical BehaviorContract -> DialogueDecision -> SpeechIdentity -> KairaResponsePlan construction, relationship/reaction continuity, apology/repair and reported-world recall together.
- Recall requests remain on grounded_recall/AI semantics while routine social turns may stay local.
- The regression preserves the authority split: higher WHAT/WHETHER planning may keep a low-score hurt conversation open while qualitative HOW still prevents the delivered local surface from jumping back to over-familiar language.
- CI #1248 passed architecture contracts, 853/853 tests, TypeScript and production build.

## 116. Runtime test-session hydration and save/load roundtrip — 2026-09-01
- loadTestSession is now exercised as runtime code with mocked Firestore rather than only source-string contracts.
- Reverse-ordered turn documents are sorted chronologically and the latest turn-local dynamic state, reactionMode, relationship lifecycle, responsePlan, provider/timings and world appraisal/policy/guard are restored without stale session-summary overwrite.
- saveTestSessionTurn -> Firestore payload -> loadTestSession roundtrip is also covered so metadata/state survival is verified on both write and read boundaries.
- CI #1249 and #1250 passed the full validation pipeline.

## 117. Twenty-turn per-turn persistence roundtrip — 2026-09-01
- Twenty sequential KDM turns are saved through the real persistence API and hydrated back from deliberately reversed Firestore documents.
- Every restored turn must equal its own original dynamicStateAfter and responsePlan; the regression explicitly rejects collapse of all historical turns into the final state snapshot.
- Turn document IDs are required to remain unique across the 20-turn run.
- CI #1252 passed architecture contracts, full tests, TypeScript and production build.

## 118. Deterministic final-delivery authority against bad model drafts — 2026-09-01
- Regression deliberately supplies model drafts that violate qualitative hurt, stopQuestions, stopTalking and reported-attribution recall constraints.
- The canonical final gates remove forbidden humor/question/over-familiarity, enforce closure budgets and repair reported claims without relying on model compliance.
- Final delivered text is required to have zero KairaResponsePlan issues after deterministic enforcement/world-memory guarding.
- CI #1253 passed the full validation pipeline.

## 119. Server-to-client authoritative response boundary — 2026-09-01
- droitChatService.sendMessage is exercised with a mocked /api/chat response to verify the client does not reinterpret a server-authoritative final reply.
- Final reply, dynamicState, reasoningTrace, consistency, responsePlan, worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard and controlledSpontaneity are projected through the client boundary unchanged.
- Server session/turn/instance/provider identifiers remain authoritative as well.
- CI #1254 passed architecture contracts, full tests, TypeScript and production build.

## 120. Provider outage fallback and request-local provider observability — 2026-09-01
- Initial AI-generation failure no longer necessarily collapses /api/chat to HTTP 500. Moves with an existing grounded deterministic fallback can continue through the same final enforcement chain.
- Factual answer_or_clarify moves still return no invented fallback; if the model provider is unavailable and no grounded fallback exists, the generation error is preserved rather than fabricating knowledge.
- Deterministic provider-fallback text is not learned into persistent language style. If a later real repair generation succeeds and becomes the final reply, normal accepted-reply learning is re-enabled.
- Provider observability is request-local: generateTextResult returns text + providerUsed, removing the old module-global activeAiProviderUsed concurrency race. Repair provider metadata changes only when that repair becomes the chosen reply.
- Client KairoProviderUsed explicitly includes deterministic_fallback.
- CI #1257, #1260 and #1263 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Audit timeout/retry idempotency. droitChatService aborts the client request at 35 seconds, but a server request can continue processing/persisting after the client disconnects. A retry must not apply the same logical user turn twice or advance relationship/state twice.

## 121. Autonomous Life production authority wiring — 2026-09-02
- Due schedule query/discovery, trusted autonomous-life worker tick and instance-scoped execution/schedule occupancy read-model are active.
- Instance-owned autonomous dynamic-state snapshots are persisted and assembled into canonical planning source snapshots; chat/KDM state changes feed this authority through retry-safe observation coordination.
- Activity catalog authority is persistent, instance-owned and provisioned only through authenticated trusted routes. Empty/malformed active catalogs fail closed.
- Terminal execution and material affect changes emit durable, retry-safe planning-trigger inbox records. The planning worker assembles catalog, environment, occupancy and dynamic-state sources before committing a proposal.
- Missing source facts are persisted as deferred trigger work with bounded backoff; deferred work cannot hot-loop or starve unrelated planning items. Autonomous ticks surface this condition as `degraded` readiness.
- Proposal recovery and due schedule dispatch remain stage-isolated so one failed authority does not block other canonical work.

## 122. Durable autonomous-life tick identity and holistic health — 2026-09-02
- The complete autonomous-life wakeup now has its own Firestore-backed run receipt and lease authority (`kairaAutonomousLifeWorkerRuns`). A stable `x-kaira-worker-run-id` can own the whole tick only once.
- Concurrent retries while the lease is live return `busy` without re-running planning, recovery or schedule dispatch. Terminal retries replay the persisted outcome without applying stages twice; expired leases can be reclaimed safely over independently idempotent stages.
- Terminal receipts persist compact stage summaries rather than unbounded runtime payloads: planning completed/busy/deferred/failed counts, proposal recovery counts and schedule dispatch counts.
- `/internal/workers/kaira/autonomous-life` is wired to the durable coordinator. It returns HTTP 202 for a live duplicate, replays persisted completed/degraded outcomes, and preserves retryable failure status for partial/failed ticks.
- `/internal/workers/kaira/autonomous-life/health` is an authenticated read-only holistic health projection over durable tick history. It distinguishes healthy, degraded, unhealthy and unknown; detects deferred readiness, partial/failed outcomes, expired leases and stale wakeups.
- Permanent autonomous runtime CI now explicitly gates the whole-tick store, durable coordinator, holistic health policy and route contracts.

### Next verified development question
- Production wakeup ownership is still external to this repository. Verify the deployed scheduler/cron invokes `/internal/workers/kaira/autonomous-life` with a stable unique run id and `KAIRA_INTERNAL_WORKER_SECRET`, then perform a real Firestore smoke test covering receipt creation, replay, degraded health and recovery to healthy.

## 123. Repository-owned production wakeup and HTTP/Firestore smoke contract — 2026-09-02
- GitHub Actions now owns a non-overlapping five-minute autonomous-life wakeup. It is enabled only when the repository variable `KAIRA_AUTONOMOUS_LIFE_URL` is configured, so an unknown deployment target is never guessed.
- The scheduler uses `github.run_id` as the stable logical wakeup identity and deliberately excludes `run_attempt`; a GitHub rerun therefore replays the same durable worker receipt instead of applying the tick twice.
- `KAIRA_INTERNAL_WORKER_SECRET` is read only from GitHub Actions secrets and is never stored or printed by the repository.
- The native Node runner invokes the authenticated worker, repeats the same run id to prove the Firestore receipt replays without outcome drift, then reads holistic health and requires that the new durable run is visible.
- Completed and degraded ticks are accepted; partial/failed ticks, non-JSON responses, run correlation drift, replay failure, unhealthy/unknown health and missing receipt visibility fail the scheduled job.
- Permanent autonomous runtime CI gates cron cadence/concurrency, stable identity, secret handling, replay verification and health verification.
- Holistic health uses a separate autonomous deployment config with cadence-aligned defaults (15-minute stale threshold, 20 recent receipts); it no longer incorrectly depends on proposal-recovery backlog thresholds.

### Next verified development question
- Configure the production host and GitHub with the same `KAIRA_INTERNAL_WORKER_SECRET`, set repository variable `KAIRA_AUTONOMOUS_LIFE_URL` to the real HTTPS deployment origin, manually dispatch one wakeup, and verify the first live receipt/health result before relying on cron.

## 124. Instance-owned planning authorities and real trigger inbox completion — 2026-09-02
- Activity catalogs are no longer stored under one global `active` document. Every autonomous Kaira instance owns its persistent catalog at `kairaActivityCatalog/{kairaInstanceId}`; trusted read/write routes require explicit instance identity.
- A deterministic built-in catalog is created only when an inbox owner has no catalog. Existing instance-owned catalogs are never overwritten by bootstrap provisioning.
- Instance-owned autonomous dynamic state receives a canonical baseline only when no observed chat/KDM state exists. Later real observations remain the sole update authority and continue emitting material affect triggers.
- The platform environment is created for a missing instance and refreshed only while its canonical entries still equal the built-in platform semantics. Any instance-specific environment diverging from those semantics is preserved unchanged.
- The planning inbox processor provisions these durable authorities before composing its fail-closed source snapshot. Terminal execution and material affect changes remain the real, durable trigger sources; no synthetic polling trigger or chat-state alias was added.
- Catalog, environment, occupancy and dynamic state are composed under the same inbox record identity before the retry-safe planning commit, closing the production `catalog_missing` / `environment_missing` / `dynamic_state_missing` readiness path.

### Next verified development question
- Verify one deployed scheduled wakeup consumes the previously deferred terminal triggers, creates or deliberately declines a proposal under canonical policy, and returns healthy holistic runtime status.

## 125. Autonomous Life production acceptance and runtime maintenance — 2026-09-02
- PR #19 merged as main commit `34a1adc31416ff3091b4077112c1bddde11cf03c`; Render deploy `dep-dabrk5fqj5pc73dhao6g` became live from that exact commit.
- Scheduled production wakeup `gha-autonomous-33596788847` completed on the deployed authority wiring, replayed its durable Firestore receipt without drift and returned holistic `healthy` status. This closes the previously deferred source-authority recovery acceptance item.
- Successful scheduler output now includes the receipt's bounded planning, recovery and schedule summaries, making future production acceptance observable without exposing credentials or unbounded item payloads.
- GitHub CI and the autonomous scheduler use `actions/checkout@v5`, `actions/setup-node@v5` and Node 24, removing the Node 20 deprecation path observed in the live scheduler run.
- The earlier timeout/retry question is closed by request fingerprint reuse, distributed Firestore ownership/lease coordination and lost-response E2E replay contracts: one logical turn cannot advance relationship or dynamic state twice across process instances.

### Autonomous Life phase status
- Production authority wiring, persistent instance ownership, real trigger delivery, repository-owned scheduling, durable replay, holistic health and live recovery acceptance are complete. No known Autonomous Life production-runtime implementation item remains open.

## 126. Canonical behavior authority — PR1 hardening + PR2 vertical slice (PR #26) — 2026-09-02
- SemanticInterpretation@2: a lexical/regex slur hit is now a CANDIDATE signal only. It produces neither high `disrespect` nor a hard-stop until independent hostility evidence corroborates it (pointed 2nd-person address, serious-conflict framing, frustration, coercion/rejection, or a trailing-vocative slur in a multi-word turn). `event.valence`/`event.redLine` do not count as evidence (circular). Benign food/compound uses ("kaşar ekmek", "kaşarlı tost", "kaşar peyniri severim") grade to `disrespect` 0, target `event`, no `insult` act. A lone one-word slur stays a candidate. Banter/insult ambiguity is preserved (low non-zero `disrespect` + high `jokingConfidence` + wide uncertainty). 6 permanent counter-example tests in `semanticContextGrading.test.ts`.
- `evaluateRedline` (from the earlier PR1 fix, retained): a `redline.minPresentSeverity` gate means a present-turn severity below the gate never hard-stops on history alone; repetition / priorBoundarySet are multipliers, not additive contributors; an apology or a low-severity turn cannot hard-stop from a negative trace.
- RelationshipReducer: while `conversationState === "disengaged"`, only an explicit repair act (apology / repairAttempt) advances `repairProgress` — a calm plea, neutral chat or flirting is not repair. `repairProgress` still requires real injury (`repairInjuryFloor`) to accumulate at all.
- PR2 layers added (behind `PLAN_RESOLVER_V2`, default OFF = byte-identical legacy plan): `kairaHardConstraints.ts` (`deriveHardConstraints` → deontic `HardConstraintSet`: policy + safety vetoes, absolute), `kairaSoftTendencies.ts` (`deriveSoftTendencies` → graded `SoftTendencyProfile`; openness / warmth / guardedness are orthogonal axes; `conversationState` scales openness, never gates it), `kairaPlanResolver.ts` (`resolveKairaResponsePlan` → per-turn snapshot; hard clamps, soft fills, uncertainty damps graded drives without flipping a hard gate). `chosenTone` / `register` / `stance` are emitted only as non-authoritative `projections`. `config/kaira-character-policy.json` holds the hard layer's non-relationship inputs (flirtingAllowed, acceptsSlurBanter, maxIntimacy, epistemicHonesty). 10 contracts in `kairaPlanResolver.test.ts`.
- `buildKairaResponsePlan` wired: flag OFF returns the legacy plan before any resolver code runs; flag ON replaces the behavior gates with the resolver's, keeps every legacy field name populated, and adds the canonical axes/obligations/projections.
- Verification: full `vitest run` failing-test set is byte-identical on this branch and `origin/main` (15 failing tests / 11 files, all pre-existing Windows source-assertion / property / integration contracts; 0 branch-sourced). `test:contracts` identical 7 pre-existing failures on both. `test:beta` 46/46 green. `lint` (`tsc --noEmit`) and `build` green. Golden 18-turn KNT session (`knt_test_user_x_new`) green with `RELATIONSHIP_REDUCER_V2` + `PLAN_RESOLVER_V2` ON, incl. T11 teasing "kaşar" (no hard-stop), T14 combined-signal hard-stop, T15–T18 repair moving out of disengaged, and K2 (openness > 0 at every non-hard disengaged turn).
- Known flag-ON divergence (intentional, ADR-0006 §1): with `RELATIONSHIP_REDUCER_V2` ON, a client `behaviorPolicy` with `priority:"boundary"` / `continueConversation:false` no longer forces `conversationState` — the reducer is the sole authority for relationship state. `kdmConsistencyEngine.test.ts`'s "forces disengagement as a short boundary response" asserts the pre-ADR client-authority model and fails only with the flag ON (flag OFF: byte-identical, passes). It is retired with the flag in PR5.

### Next verified development question
- PR3 (`CANONICAL_PROMPT_BUILDER`): assemble the single system-prompt block from the resolved `KairaResponsePlan` — one behavior block, every plan field represented exactly once, realizer-lockdown clause present — and confirm no prompt-dependent contract regresses with the flag OFF.

## 127. Kaira does not reciprocate flirtation — hard character-policy boundary (PR #26) — 2026-09-02
- Product decision: `KairaCharacterPolicy.flirtingAllowed = false` in both `src/services/kairaHardConstraints.ts` (`DEFAULT_KAIRA_CHARACTER_POLICY`) and `config/kaira-character-policy.json`. Kaira may be warm or funny; she does not flirt back, and does not start romantic/sexual innuendo.
- The gate is HARD. `deriveHardConstraints` derives `flirtingAllowed` and `counterFlirtAllowed` **only** from the character policy (`policy.flirtingAllowed === true && !hardDisengage`). `resolveKairaResponsePlan` never raises them — soft `intimacyInclination` / `warmthTendency`, trust, warmth, prior `conversationState`, `register` and `chosenTone` are all irrelevant to this boolean. When flirtation is forbidden the hard `intimacyCeiling` is pinned to `NON_ROMANTIC_INTIMACY_CEILING` (0.25), which is below the resolver's `allowAffection` threshold (0.3), so romantic-physical endearments ("öp", "aşkım", "sevgilim") are gated too; plain warmth ("iyi ki varsın") is not in that gate and stays available.
- `KairaResponsePlan` gains `flirtationAllowed?` / `counterFlirtAllowed?` (canonical path only; absent on legacy). `requiredContent` carries `no_counter_flirt`. `kairaResponsePlanInstruction` emits `counterFlirt=forbidden` + an absolute-ban clause for the realizer. `findKairaResponsePlanIssues` adds `response_plan_counter_flirt_blocked` when `plan.counterFlirtAllowed === false` and the reply reciprocates a romantic/sexual advance (narrow `COUNTER_FLIRT_RE`: unambiguous reciprocation phrases + kiss/love emoji). Guard is `=== false` (strict), so the legacy path (`undefined`) is byte-identical.
- Regression: `src/services/kairaFlirtationBoundaryRegression.test.ts` — direct flirt proposal → counter-flirt reply is a plan issue; flirt hint in banter → warm/funny fine, counter-flirt not; maxed-out soft intimacy/warmth + close relationship → gate + ceiling unchanged; every `conversationState` × `register` combination → still forbidden; legacy path untouched. `kairaPlanResolver.test.ts` adds "the SHIPPED default policy forbids flirtation".
- Verification: full `vitest run` (flag OFF) 15 fail / 1500 pass — failing set byte-identical to `origin/main` (0 branch-sourced). `test:beta` 46/46. `lint` + `build` green. Flag-ON canonical suites green except the one intentional ADR-0006 §1 divergence recorded in state 126.

### Next verified development question
- Unchanged from state 126: PR3 (`CANONICAL_PROMPT_BUILDER`) — assemble the single system-prompt block from the resolved `KairaResponsePlan` (flirtation ban included as one clause, represented exactly once) and confirm no prompt-dependent contract regresses with the flag OFF.

## 128. CANONICAL_PROMPT_BUILDER — single behavior authority in the system prompt (PR3) — 2026-09-02
- Forensic map of the pre-existing prompt authority stack (server.ts `system`): `behaviorContractInstruction` (conversationState / playfulness / affection / questions / forgiveness / reopeningCloseness / stance / length + "aykırı sosyal anlam üretme"), `buildDialogueDecisionInstruction` gate lines (Takip sorusu yasak/bir tane, Uzunluk/Kelime bütçesi, Desteksiz tahmin yasak), `relationshipInstruction` directives (şaka/flört/yakınlık yasakları), the `KDM: ... karar=chosenTone. Bu davranış kararları bağlayıcıdır; soru/mizah/mesafe/konuşmayı sürdürme sınırlarını ihlal etme.` line, and `kairaResponsePlanInstruction`. Every WHAT/WHETHER gate (question, humor, affection, forgiveness, reopening, length, emoji, continue) was stated 2–4 times across these blocks.
- New `src/services/kairaCanonicalPromptBuilder.ts`: `buildCanonicalBehaviorBlock(plan)` — one block, every authoritative `KairaResponsePlan` field exactly once (move, continueConversation, allow{Question,Humor,Affection,Forgiveness,ReopeningCloseness}, flirtationAllowed, counterFlirtAllowed, maxSentences, maxWords, emojiBudget, opennessAxis, warmthAxis, guardedness, intimacyCeiling, requiredContent, hardReasons, uncertainty) + the absolute counter-flirt ban + a hard realizer-lockdown clause ("style/tone/register open no gate; you only realize the plan into one sentence"). `buildCanonicalObservationalContext` — KDM intent/sentiment/scores + reaction flavor, explicitly "KARAR DEĞİL", no gate verbs. `buildCanonicalDialogueMoveContext` — move/target/rationale only.
- `server.ts` behind `CANONICAL_PROMPT_BUILDER` (`canonicalPromptOn`): `responsePlanInstruction` uses the canonical block, `dialogueDecisionInstruction` uses the move-context, and the `system` template ternary drops `behaviorContractInstruction`, the `relationshipInstruction` directives and the binding `KDM` line — replaced by `${responsePlanInstruction}\n${canonicalObservationalContext}`. Flag OFF: the ternary's legacy branch keeps the exact prior substring order → byte-identical system prompt.
- `chosenTone` / `register` / `speechIdentityPrompt` stay as HOW/style only (already non-granting; the lockdown clause subordinates them explicitly). Controlled spontaneity line unchanged (already "İZİN OTORİTESİ DEĞİL", cites plan budgets).
- Tests: `kairaCanonicalPromptBuilder.test.ts` (field-exactly-once, lockdown clause, no legacy-string leak, degrade-safe without PLAN_RESOLVER_V2), `kairaCanonicalPromptAuthorityRegression.test.ts` (assembled canonical section has no duplicate decision token; counter-examples: plan question=false vs dialogue suggesting a question, plan humor=false vs playful speech, counterFlirt=false vs maxed intimacy + warm register, hard disengage vs warm tone, high uncertainty vs a hard gate; flag-OFF server-source parity).
- Verification: full `vitest run` (flag OFF) 15 fail / 1517 pass — failing set byte-identical to `origin/main` (11 files, all pre-existing Windows source-assertion / property / integration; 0 branch-sourced). `test:contracts` identical 7 pre-existing failures. `test:beta` 46/46. `lint` + `build` green. Golden 18-turn KNT + canonical/flirtation/plan suites green with `RELATIONSHIP_REDUCER_V2` + `PLAN_RESOLVER_V2` + `CANONICAL_PROMPT_BUILDER` ON.
- Red-team: after the flag, the only strings stating an allow/forbid social decision are in the canonical block. `speechIdentityPrompt` percentages, `socialStyle` ("Her cevabı soruyla bitirme") and `buildDialogueBoardInstruction` ("En doğal tek sosyal hareketi seç: ...soru...şaka...") mention move *types* but state no gate; the lockdown clause + the still-running post-hoc guards (`findKairaResponsePlanIssues`, `enforceBehaviorContract`, `findDialogueDecisionIssues` — all sourced from `responsePlan.*`) subordinate them. Residual: `CANONICAL_PROMPT_BUILDER` is meant to run with `PLAN_RESOLVER_V2`; standalone the block shows axes as `n/a` and flirtation still resolves to forbidden (safe default). Full de-mention of move-type menus in `socialStyle` / dialogue board is a prompt-consolidation follow-up, not an authority-duplication issue.

### Next verified development question
- PR4 `UNIFIED_GUARD_PASS`: make the post-generation guard/consistency pass consume the canonical plan directly (plan-conformance instead of the narrow tone/keyword regexes), compute consistency on the delivered text, and confirm world/epistemic/autobiographical contract tests stay green with the flag OFF.

## 129. Foundation repair — first real conversation recovery (claude/kaira-foundation-repair-v1) — 2026-09-03
- **Canonical reality.** Re-verified on `a9844ba`: `RELATIONSHIP_REDUCER_V2` / `PLAN_RESOLVER_V2` / `CANONICAL_PROMPT_BUILDER` are the only three wired canonical flags, all default OFF, no deploy/CI sets them. `SEMANTIC_SCHEMA_V2` and `UNIFIED_GUARD_PASS` still have zero non-test reads (out of this PR's scope — status only). New `vitest.canonical.config.ts` + `npm run test:canonical` turns the three flags ON for a curated canonical set (reducer, plan resolver, canonical prompt builder, discourse foundation, first-8-turn regression, repair invariant). Added to CI `validate` as its own step. Default `vitest run` / `test` / `test:contracts` / `test:beta` stay on the legacy engine unchanged.
- **YDM demoted from second brain to renderer.** `kairoLocalLanguageEngine.tryLocalKairoReply` no longer calls `interpretSemanticEvent`, no longer runs the canonical-normalizer intent fallback, and no longer classifies intent. `trivialRenderIntent(dialogueMove, event, discourse)` renders ONLY when: the dialogue decision chose a trivial move (`complete_social_routine` / `natural_reaction` / `invite_emotional_context`) or is absent (legacy direct call); the shared `SemanticEvent.socialRoutine` is a trivial routine; there is no hard content (insult / redLine / apology / repair / stopTalking / coercion / manipulation / privacy / recall / confusion); there is no previous-turn dependency; and the routine is not saturated. `server.ts` local short-circuit now also runs `findDialogueDecisionIssues` + `findKairoResponseRhythmIssues` + `findKairoGroundingIssues`, and only returns the local reply when `localDeliveryIssues` is empty — otherwise it falls through to the full LLM pipeline. Latency win kept, decision authority removed.
- **Minimal DiscourseState.** `src/types/discourseState.ts` + `src/services/discourseStateReducer.ts` + `discourseSocialAct.ts`. Fields: `routines.{greeting,howAreYou,whatDoing}` consecutive-window counters (saturated at count ≥ 2; a re-greeting after a gap resets), `pendingQuestion` ledger (asker / kind / answered), `kairaRecentActs` + `selfRepeat` (tracks the social ACT, not exact strings), `previousTurnDependency` (kaira_question|kaira_statement × answer|answer_with_friction|clarification|correction). Pure reducer, recomputed each turn by `deriveDiscourseState(history, currentTurn)` — no new persistence, no relationship/mood mutation, no new decision authority. Threaded into `planDialogueResponse` (6th arg) + `tryLocalKairoReply` (10th arg) + the system prompt as `buildDiscourseObservationalInstruction` (explicitly "GÖZLEMSEL — KARAR DEĞİL"). The delivered reply feeds the next turn only through history classification.
- **First-8-turn root causes closed.** `planDialogueResponse` gains three DiscourseState-driven rules: previous-turn dependency → `follow_previous_answer` / `acknowledge_correction` / `repair_or_rephrase` (so "iyi dedim ya" is a friction answer, never a greeting); saturated greeting → `natural_reaction` "selamlaşma zaten yapıldı" (no blind loop); saturated reciprocal routine → `natural_reaction` with `allowFollowUpQuestion=false` (no "sen nasılsın" re-ask). `kairaFoundationFirstConversationRegression.test.ts` replays the 8 turns through the real stage sequence on the canonical path and asserts the behavior class + state chain per turn (not wording).
- **repairProgress.** Verified the canonical reducer invariant (`relationshipReducerRepairInvariant.test.ts`): no injury + positive/neutral/apology turn → repairProgress does not advance; real injury + apology → it can. The dying legacy `kdmConsistencyEngine` positive-turn `repairAfter += 3*forgivenessFactor` (no injury gate) was NOT patched — legacy is being retired, and canonical is the tested path.
- **emotional_load.** On the deterministic `interpretSemanticEvent` path, every ordinary first-test turn has `emotionalLoad = 0` and `semanticSentimentToKdm` never returns `duygusal_yük` (`kairaEmotionalLoadWiring.test.ts` pins this). The live-KNT over-labelling came from the LLM semantic provider, which sets `emotionalLoad` with no confidence gate while `semanticSentimentToKdm` treats any `> 0` as full `duygusal_yük`. Per task §6 this is a flat-semantic-model issue, left as documented risk + `it.todo`, not patched.
- **Validation.** `tsc` clean. Full `vitest run` 14 fail / 1568 pass — failing set byte-identical to `origin/main` (`a9844ba`), 0 branch-sourced (branch adds +39 passing). `test:contracts` identical 7 pre-existing failures. `test:beta` 46/46. `test:canonical` (flags ON) 126 pass + 1 todo. `build` clean. Legacy-YDM contract tests updated where they asserted the removed re-classification (typo→intent invention, provider-collapse re-classify) — inverted to the new "defer / trust shared event" contract, not deleted.
- **Residual risks.** (1) Routine saturation uses turn-distance, not wall-clock — a re-greeting after a long real-time gap with no intervening turns could still read as saturated (LLM still handles it, with an overridable "done" hint). (2) When a user question on turn N marks Kaira's pending question answered, a friction reply on turn N+1 attributes `previousTurnDependency.on` to `kaira_statement` instead of `kaira_question` (friction + `follow_previous_answer` still fire correctly). (3) `SEMANTIC_SCHEMA_V2` / `UNIFIED_GUARD_PASS` remain dead flags. (4) Typo greetings the understanding layer does not normalize now go to the LLM (small latency cost; belongs in the understanding layer).

### Next verified development question
- Wire typo/near-neighbour normalization into the understanding layer (Zemberek + `normalizeKairoLanguageInput` feeding `interpretSemanticEvent`) so `slm`/`nbr`/`napyon` set `socialRoutine` before the renderer sees them — restoring local latency for those without re-introducing a second classifier in the renderer.

## 131. 2026-09-03 — PR32 / UNIFIED_GUARD_PASS canonical final-delivery checkpoint
- ADR-0006 PR4 için `src/services/kairaResponseConstraintPass.ts` eklendi.
- Canonical final-delivery sırası tek pass içinde sabitlendi: **world truth → autobiographical truth → epistemic truth → KairaResponsePlan enforcement → final conformance**.
- Truth guard katmanları sosyal WHAT/WHETHER kararı üretmiyor; çözülmüş `KairaResponsePlan` canonical davranış otoritesi olarak kalıyor.
- Fallback metinleri doğrudan teslim edilmiyor; aynı ordered constraint pass içinden yeniden geçiriliyor.
- Canonical consistency yalnız son teslim edilecek metinde hesaplanıyor; legacy `chosenTone` / intent / sentiment keyword eşleşmeleri canonical accept/reject otoritesi olmaktan çıkarıldı.
- `server.ts` içinde `UNIFIED_GUARD_PASS` flag'i hem local fast-path hem AI/model yanıt yoluna bağlandı. Flag OFF iken mevcut legacy enforcement/rollback yolu korunuyor.
- `kairaResponseConstraintPass.test.ts`, `kairaUnifiedGuardWiringContracts.test.ts` ve epistemic runtime seam kontratları canonical/legacy sınırı doğruluyor.
- Activity-permission side channel PR31'de planner-owned reply dışına çıkarıldığı için bu pass sonrasında planner cevabını tekrar mutate etmiyor.
- PR32 merge ön koşulu: full CI + canonical suite + Architecture Review tamamen yeşil. Sonraki iş PR5 değildir; önce `CANONICAL_PATH_PROMOTION_GATE` kanıtları (canonical ON beta acceptance, recorded-session replay, OFF rollback drill, canonical-vs-legacy açıklanmış diff) tamamlanmalıdır.


## 132. Canonical promotion + PR5 compatibility removal complete — 2026-09-03
- PR #33 completed and merged the evidence phase for `CANONICAL_PATH_PROMOTION_GATE`: canonical beta acceptance, recorded/golden replay, explicit all-flags-OFF rollback drill and same-input canonical-vs-legacy diff review all passed. The gate also exposed and fixed hard-boundary repair FSM deadlocks instead of masking them with relaxed tests.
- PR #34 `refactor(kaira): remove canonical rollout compatibility` merged into `main` as commit `4b9f10d5a1134b6df0c6e8f61520ecc624e5a585`.
- The five temporary canonical rollout flags and their legacy runtime decision branches are removed. SemanticInterpretation@2, canonical RelationshipReducer, canonical PlanResolver, canonical prompt authority and unified final constraint pass are now the only live behavior path. Runtime rollback is no longer a flag flip; it is repository-level `git revert`.
- Final PR #34 head `50c25b8b93c64dc7489d0029d771a579d8545701` passed Architecture Review, architecture contracts, autonomous runtime contracts, beta regression, beta conversation acceptance, full Vitest suite, TypeScript check, production build, docs-guard and behavior-guard before merge.
- Canonical relationship semantics are now locked as follows: a lone lexical insult such as `salak` remains ambiguous/candidate-only; an explicitly targeted insult such as `sen salaksın` can produce relationship-sensitive `irritated` / `hurt` / `withdrawn`; hard-boundary recovery is staged rather than instant; a calm follow-up can preserve residual hurt while injury is measurably recovering, but integer score-floor stalling cannot keep Kaira qualitatively hurt forever.
- Temporary promotion/debug/codemod workflows, runners and artifacts used during migration are not part of the final runtime architecture.

### Next verified development question
- Start from this post-PR5 canonical-only `main`. Do **not** reopen PR #30–#34, rollout flags, or canonical-vs-legacy compatibility work unless a new measured regression specifically requires a revert/audit.
- Derive the next product task from current `main` and this file. The architecture-migration phase is closed; the next work should return to higher-level Kaira product behavior/quality validation rather than rebuilding compatibility paths.

## 133. Single semantic authority end-to-end — PR #35 — 2026-09-03
- PR #35 merged as commit `183ceb925f69157ce38177fab732b285521ff598` and closed the measured dual semantic-authority defect.
- Canonical per-turn truth is immutable `SemanticInterpretation@2`; provider output that is invalid/incomplete fails explicitly to `fallback_regex` rather than being silently default-filled.
- Live/history/client-server/persistence/hydration carry the semantic snapshot; historical discourse replay consumes persisted snapshots and never reparses raw historical text.
- Production KDM consumes `canonicalSemantic.interpretation` plus its deterministic grounded event projection through `analyzeKdmInteractionCanonicalTurn(...)`.
- Relationship scope is produced upstream at the language-understanding/entity-grounding boundary; third-party turns cannot damage/reward the dyadic Kaira-user relationship.
- `stopQuestions` and full-conversation `stopRequest/stopTalking` remain separate semantics.
- ADR-0012 records the accepted single-authority model. Full CI and Architecture Review passed before merge.

## 134. Semantic content / dialogue policy decoupling — PR #36 — 2026-09-03
- PR #36 merged as commit `704343baff46788cf599cbd348369d67f7c0399c`.
- Generic complaint/confusion classification no longer forces `repair_or_rephrase`.
- Clarification dependency and repair policy require explicit typed `repairSignal` evidence plus conversational dependency; stale or externally supplied clarification state cannot manufacture repair by itself.
- This preserves the authority split: semantic classification describes what the user turn contains; dialogue policy decides what Kaira should do.
- Full CI and Architecture Review passed before merge.

## 135. Binding social repetition policy — PR #37 — 2026-09-03
- PR #37 merged as commit `160a04720972518f73d844192f39fd0bec7424bf`.
- `DiscourseState.selfRepeat` is no longer observational-only. It projects into typed `DialogueDecisionPlan.repeatGuard` while preserving the already-chosen semantic move.
- Final dialogue validation deterministically rejects the same repeated Kaira social act; deterministic greeting/ack fallbacks are repetition-safe.
- Farewell is intentionally exempt because completing a user's goodbye remains a social obligation.
- Repetition evidence may constrain delivery surface, but may not reinterpret factual/recall/repair/correction/emotional semantics.
- ADR-0014 and permanent repetition contracts/regressions lock this behavior.

## 136. Emotional-load trust and threshold calibration — PR #38 — 2026-09-03
- PR #38 merged as commit `da89bf6b6cac9c945335d992bc8bd7d475c63b69`.
- Shared emotional-load policy now uses explicit bands: none < 0.30, mild 0.30–0.59, salient 0.60–0.79, intense >= 0.80.
- Canonical model emotional load may raise legacy/appraisal projection only when evidence confidence >= 0.65 and overall uncertainty <= 0.55; deterministic regex floor remains independently preserved.
- KDM maps to coarse `duygusal_yük` only at salient-or-higher load (>= 0.60). Mild trusted emotion remains numerically observable without being flattened into the full coarse label.
- ADR-0015 and permanent wiring/calibration regressions lock the policy. Final full suite, TypeScript, production build, guards and Architecture Review passed.

## 137. Canonical mixed 20-turn product acceptance — PR #39 — 2026-09-03
- PR #39 merged as commit `7db585f3f36776a883cb9a09d8f7f096b0cf7dda`.
- The existing high-level mixed local/AI + reported recall + relationship repair 20-turn regression was promoted from legacy test ingress to the live canonical boundary.
- Every turn now enters through `understandTurkishMessage(...)` with an immutable v2 snapshot, then feeds the gateway's interpretation + grounded event into `analyzeKdmInteractionCanonicalTurn(...)`.
- Every user history turn persists its exact `semanticInterpretation` snapshot and DiscourseState is derived from canonical history.
- The acceptance flow keeps both local and AI routing, world-memory reported-attribution guard checks, insult continuity, repair movement, repetition-aware discourse and monotonic interaction history.
- ADR-0016 records this test authority. Architecture contracts, autonomous runtime contracts, beta regression, beta conversation acceptance, full tests, TypeScript, production build, docs-guard, behavior-guard and Architecture Review all passed.

### Current verified checkpoint
- No open PR or open issue existed immediately before PR #39 work; PR #39 is now merged.
- PR #30–#39 are complete. Do not reopen canonical rollout compatibility, C1/C2, repetition or emotional-load work without a new measured regression.
- The architecture-migration/hardening phase is closed. Current work should remain in higher-level product behavior and quality validation.

### Next verified development question
- Audit **semantic-provider quality at the canonical ingestion boundary** separately from downstream behavior authority: build a deterministic recorded-output / fixture matrix for natural Turkish turns (social routine, emotional opening, complaint/confusion, repair signal, recall, third-party report, insult ambiguity, explicit stop, advice request) and measure whether provider-produced `SemanticInterpretation@2` preserves the field semantics now relied on by the canonical-only runtime. Do not loosen downstream policy to compensate for provider misclassification; fix producer/schema/prompt evidence only when a measured case proves it.



## 138. Canonical semantic-provider production quality stabilization — PR #41–#44 — 2026-09-04
- PR #41 merged as commit `1e8c53a9c0269a4160b4643ab4adb55957fd30f1`. A permanent nine-family recorded semantic-provider matrix now locks natural Turkish field semantics at the canonical ingestion boundary: social routine, emotional opening, generic complaint without repair, typed clarification repair, conversation recall, third-party reported insult, lone target-ambiguous insult, question-only stop and explicit advice request.
- PR #42 merged as commit `2f4595677ed41a8fab7f9308a6e045be3835ea4a`. KNT persistence/UI now expose the exact canonical `SemanticInterpretation@2` snapshot plus semantic source/provider per turn, so live provider drift can be diagnosed without downstream reparsing.
- First deployed production smoke against `/api/language-understanding` measured 6/9 families passing and isolated producer-side drift only. No downstream KDM/relationship/dialogue policy workaround was added.
- PR #43 merged as commit `ede6e6c8662cea44dd0efffece83a9c762b9ede5`. Provider-boundary invariants now require prior assistant context + confusion/challenge semantics for repair, keep `stopRequest` identical to `stopTalking`, and remove stray `stop_request` social acts when full conversation stop is false. Prompt counterexamples also preserve third-party reported insult, widen lone-insult uncertainty and keep generic complaints from manufacturing repair. Full CI + Architecture Review passed.
- After PR #43 deployed, the same live production smoke improved to 8/9. The only remaining measured drift was `naber kaira`: `target:kaira` and `socialRoutine:how_are_you` were correct while the model sometimes emitted `primaryIntent:smalltalk` instead of the recorded canonical `greeting`.
- PR #44 merged as commit `f4594cc689b2e05a78c87959776642568562334f`. The provider prompt now explicitly maps `naber` / `nasılsın` to `primaryIntent:greeting + socialRoutine:how_are_you`; provider-boundary field consistency normalizes a typed `how_are_you` routine to `greeting` without reparsing raw text. Full tests, TypeScript, production build, behavior/docs guards and Architecture Review passed.
- Render deploy `dep-dad4k515efls73eucde0` became live from the exact PR #44 merge commit. The final one-time production smoke then passed **9/9** families with `semanticSource:semantic_provider` / `semanticProvider:llm_semantic_openrouter`; failed case list was empty.
- Temporary live-smoke workflow/branch content was reset to `main`; no one-time smoke workflow remains in the branch state. Semantic-provider stabilization is therefore closed unless a new measured production regression appears.

### Current verified checkpoint
- PR #30–#44 are complete and merged. Do not reopen C1/C2, repetition, emotional-load or semantic-provider stabilization without a new measured regression.
- Canonical runtime still has one semantic authority: provider-produced `SemanticInterpretation@2` plus deterministic grounded projection. Downstream policy is not allowed to compensate for provider classification drift by reparsing raw text.
- Production semantic ingestion is live on Render at commit `f4594cc689b2e05a78c87959776642568562334f` and the verified nine-family smoke is 9/9.

### Next verified development question
- Return to higher-level product behavior validation. Use the now-observable canonical semantic snapshots in real multi-turn KNT sessions to measure end-to-end natural conversation quality, speech-identity consistency and long-session behavior. Patch only failures that are reproduced in the live canonical path; do not add speculative semantic rules.


## 139. Canonical 20-turn final-delivery quality acceptance — PR #46 — 2026-09-04
- PR #46 merged as commit `0507e1acee5013ddcb5e02a271df8e8f6b7d789f`.
- Added a permanent canonical 20-turn mixed-session final-delivery quality regression spanning shared semantic snapshots -> KDM -> discourse -> BehaviorContract -> DialogueDecision -> SpeechIdentity -> KairaResponsePlan -> local/AI routing -> AI repair -> deterministic final enforcement.
- The acceptance locks delivered-text quality rather than only state continuity: response-plan conformance, speech-identity rhythm stability, relationship-sensitive HOW after hurt/repair, generic-assistant/list drift rejection and meaningful recent-reply repetition resistance are all verified in one session.
- The new acceptance exposed a real production bug in Turkish question detection: JavaScript `\b` could treat the `mi` letters inside words such as `geçmiş` as a standalone question clitic. Response-plan question detection now uses Unicode-safe letter/number boundaries and retains real punctuation-free questions such as `iyi misin` / `kaç kişi geliyor`.
- ADR-0021 records the final-delivery acceptance boundary. Full architecture contracts, autonomous runtime contracts, beta runtime regression, beta conversation acceptance, full Vitest, TypeScript, production build, behavior/docs guards and Architecture Review passed before merge.
- PR #30-#46 are now closed unless a new measured regression requires reopening a specific area.

### Next verified development question
- Run evidence-driven real multi-turn KNT conversation-quality characterization on the canonical live path. Inspect per-turn semantic snapshot, reaction/relationship state, response plan, provider route and final delivered text together. Prioritize naturalness/speech-identity/long-session failures that are reproducible; do not add speculative semantic rules or reopen the stabilized provider.

## 140. Question-stop relationship target and production acceptance — PR #53–#55 — 2026-09-04
- PR #53 closed the pure question-only stop severity leak: live `soru sorma artık` no longer creates relationship injury while still enforcing `allowQuestion=false`.
- PR #54 merged as `61c235771fcb88d17c84aa2f0d99043213d63430`. ADR-0029 and `kdmRelationshipReducerBridge.ts` now treat typed question-only stop facets (`stopQuestions=true`, `stopTalking=false`, `stopRequest=false`) as interlocutor/dyadic target evidence when grounded scope is neither `third_party` nor `event`. No raw-text reparse was added.
- PR #55 merged as `69e4843cb7572116bf16988cc4dd0162060b9a94`. Permanent canonical runtime regressions now execute `analyzeKdmInteractionCanonicalTurn` and lock both sides of the boundary: pure question-only stop remains injury-free; combined insult + question-only stop with provider `target=unknown` and preserved disrespect creates relationship injury.
- PR #55 passed architecture contracts, autonomous runtime contracts, beta runtime regression, beta conversation acceptance, full Vitest, TypeScript, production build, behavior/docs guards and Architecture Review before merge.
- Render deploy `dep-dad8948ae00c73dkpik0` became live from exact feature merge `69e4843cb7572116bf16988cc4dd0162060b9a94`.
- Final production canonical smoke passed on workflow run `33855735001`:
  - pure `soru sorma artık`: `stopQuestions=true`, `stopTalking=false`, `stopRequest=false`, `reactionMode=neutral`, `conflictScore=0`, `hurtScore=0`, `negativeEvents=0`, `allowQuestion=false`;
  - provider edge case `salak, soru sorma artık`: canonical language-understanding returned `target=unknown`, `primaryIntent=command`, `secondarySocialActs=[insult]`, `disrespect=0.4`, `coercion=0.4`, `aggression=0.3`, `stopQuestions=true`, `stopTalking=false`, `stopRequest=false`; feeding that exact typed snapshot into `/api/chat` produced `reactionMode=irritated`, `conflictScore=4`, `hurtScore=6`, `negativeEvents=1`, `allowQuestion=false`.
- Conclusion: the measured question-stop edge case is closed in production. Semantic ingestion remains the single classification authority; the relationship bridge only projects typed discourse evidence plus grounded scope.

### Next verified development question
- Return to evidence-driven live multi-turn conversation-quality characterization. Inspect semantic snapshot, relationship/reaction state, response plan, provider route and final delivered text together; patch only newly reproduced failures. Do not reopen the question-stop target/severity chain without new production evidence.


## 141. World-memory semantic retrieval authority — PR #57 — 2026-09-04
- Real 21-turn KNT characterization exposed a higher-level authority bug: ordinary temporal self-share such as `bugün çok enerjik hissediyorum` could open persistent world-memory retrieval merely because raw text contained a temporal cue, allowing unrelated past world events to hijack the reply.
- Root cause was not cross-session persistence itself. World-memory storage remains intentionally scoped by `userId + kairaInstanceId` so the same Kaira can remember grounded events across sessions. The defect was the retrieval authorization gate reparsing raw text downstream of canonical semantic ingestion.
- PR #57 merged as commit `834d02e9f7579afbcb7c8e7248c9de421872c9a4` and makes world-event retrieval authorization semantic-only: downstream retrieval consumes canonical `SemanticInterpretation@2`, and only typed `discourseAct=recall_request` authorizes persistent world-event lookup. Coordinator/property/lifecycle callers were migrated to the same typed boundary; no raw-string fallback or session-only filter was added.
- Permanent regression `kairaWorldMemorySemanticGateRegression.test.ts` locks both sides: temporal emotional self-share does not authorize world retrieval; explicit recall does. Full architecture contracts, autonomous runtime contracts, beta regression, beta conversation acceptance, 1694-test Vitest suite, TypeScript, production build, behavior/docs guards and Architecture Review passed before merge.
- Render auto-deploy `dep-dad9q54s728c73ae2hvg` became live from exact merge commit `834d02e9f7579afbcb7c8e7248c9de421872c9a4`.
- Final production smoke workflow run `33863838394` passed on the live service using one isolated user + Kaira instance:
  - seed `Ayşe bana salak dedi` persisted a grounded third-party reported world event;
  - `bugün çok enerjik hissediyorum` resolved as `intent=emotional_share`, `socialRoutine=emotional_opening`, `discourseAct=none`, and returned `retrievedWorldEvents=[]`; world-memory guard made no change;
  - `Ayşe bana ne demişti?` resolved as `discourseAct=recall_request`, retrieved the seeded event with score `10.88`, and answered `Daha önce bana, Ayşe’nin sana “salak” dediğini söylemiştin.`
- Conclusion: persistent world memory remains cross-session capable but no longer gains response authority from raw temporal keywords. Canonical semantic ingestion is the only retrieval-authorization authority.

### Next verified development question
- Continue the evidence-driven 21-turn findings in order. Next target is relationship accountability/complaint handling: distinguish user harm toward Kaira from legitimate user criticism of Kaira's own prior bad response, without adding raw-text patches or weakening RelationshipReducer invariants.
