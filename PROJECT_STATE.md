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
