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

Henüz tam doğrulanmamış:
- Kalıcı dil hafızasının uzun süre sonra davranışı gerçekten değiştirmesi.
- Çok sayıda typo ve doğal sosyal medya yazımında yanlış pozitif/yanlış negatif oranı.
- Aynı niyette cevap çeşitliliğinin doğallığı.

## 8. Konuşma kimliği
- `kairoSpeechIdentity.ts` register, cümle uzunluğu, argo, mizah, emoji, sıcaklık ve doğrudanlık üretir.
- Bu katman AI promptuna talimat olarak aktarılıyor.
- Yerel Dil Motorunda ise etkisi henüz sınırlı cevap havuzu üzerinden gerçekleşiyor.
- Konuşma kimliğinin gerçekten Kaira'ya özgü bir dil parmak izi oluşturup oluşturmadığı henüz baseline testleriyle kanıtlanmadı.

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
