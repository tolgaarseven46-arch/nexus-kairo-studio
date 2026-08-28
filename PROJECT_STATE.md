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
- GitHub Actions üzerinde TypeScript ve production build doğrulaması var; test komutu CI akışına henüz ekli değil.

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
- CI `npm run lint` ve `npm run build` çalıştırıyor fakat `npm test` henüz CI'a bağlı değil.
- KDM unit test kapsamı şu an çok küçük (4 test, ağırlıklı response consistency/repair tarafı).
- `kdmConsistencyEngine.ts` niyet ve sentiment sınıflandırması basit regex tabanlı; yeni normalizer ile tek bir canonical sınıflandırma kaynağına henüz bağlanmış değil.
- `droitChatService.ts` istemci tarafında ayrıca behavior profile hesaplıyor; sunucuda KDM tekrar davranış profili hesaplıyor. Veri akışı sadeleştirme adayı.
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
