# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı çalışma hafızasıdır**. Yeni bir sohbet başladığında önce bu dosya okunmalı; eski konuşmadan tahmin yapılmamalıdır.

## 1. Proje kimliği
- Proje: NEXUS / KAIRO Studio
- Repo: `tolgaarseven46-arch/nexus-kairo-studio`
- Ana amaç: NEXUS içinde kullanılacak Sentetik Droit karakterlerini oluşturmak, kişiliklerini tanımlamak, test etmek ve ileride sunucu yöneticisi/asistan olarak çalıştırmak.
- Kairo: örnek/ana Droit karakteri; Nexus çekirdek asistanı.
- Droit'ler klasik “bot” olarak değil, kişiliği ve dinamik davranışı olan dijital varlıklar olarak ele alınır.

## 2. Geliştirme prensibi — KTM/KDM
- **KTM:** Kairo Tutarlılık Motoru
- **KDM:** Katmanlı Doğrulama Mimarisi
- Bunlar aynı temel yaklaşımın adlandırmalarıdır.
- Sistem mevcut mimariyi çöpe atıp yeniden yazılmayacak; mevcut yapı üzerine katmanlı ve doğrulanabilir şekilde genişletilecek.
- Yeni özellik eklenirken önce mevcut tipler/servisler/akışlar kontrol edilir, sonra minimum gerekli dosya değiştirilir.
- Bir iş tamamlanmadan aynı iş tekrar yapılmaz.

## 3. Droit karakter modeli
Karakter üç ana eksende ele alınır:
1. **Fiziksel katman:** avatar, yüz/ifade varlıkları ve görsel kimlik.
2. **Beyin/kişilik katmanı:** sabit kişilik eğilimleri + davranış motoru + bağlama göre değişen dinamik durum.
3. **Görev/rol katmanı:** görevler, yetkiler ve sunucu içindeki rol davranışları.

### Kişilik hedefi
- İnsan davranışına yakın, tutarlı fakat robotik olmayan davranış.
- Slider değerleri doğrudan “cevap metni” değildir; davranış motoruna girdi sağlar.
- Aynı kişiyle ilişki süresi ve ilişki kalitesi gibi bağlamsal faktörler ilerleyen aşamada dinamik davranışı etkilemelidir.
- Örnek hedef: Kaira ilk gün tanıştığı kişiye daha temkinli; uzun süredir iyi ilişki kurduğu kişiye karşı daha rahat/toleranslı davranabilmelidir.

## 4. Mevcut teknik yapı
- React + Vite + Tailwind CSS.
- Firebase / Firestore / Storage kullanılıyor.
- Gemini API entegrasyonu mevcut çalışma alanının parçası.
- Ana UI bileşenleri arasında Studio layout ve sekmeler bulunuyor.
- Bilinen sekmeler: KairoChatTab, CharacterTab, TestLabTab, BrainTab, SettingsTab.
- Bilinen servis/tipler: `droitPersonalityService`, `droitExpressionAssetService`, `droitChatService`, `droitBehaviorEngine`, `characterService`; `DroitPersonalityTraits`, `DroitDynamicState`, `DroitExpressionMode`, `DroitExpressionId`, `DroitExpressionAsset`.
- Davranış profili üretimi için `computeBehaviorProfile(personality, userMessage)` yaklaşımı kullanılıyor.
- Chat katmanında kişilik, geçmiş ve karakter bilgisi prompt/çalışma girdilerine dahil ediliyor.

## 5. Studio / Karakter sayfası tasarım kararı
Hedef: masaüstü uygulaması hissi veren, tek ekranda mümkün olduğunca çok bilgiyi gösteren, sade ve şık bir kontrol paneli.

Character sayfasındaki mevcut yön:
- Sol: kimlik / sabit karakter bilgileri / temel karakter kuralları.
- Orta: kişilik slider'ları.
- Sağ: özet ve dinamik durum/teste ayrılabilecek alan.
- Gereksiz kalabalık ve özellikle şimdilik “ifadeler” gibi ikincil kontroller ana karakter ekranına doldurulmayacak.
- Kullanıcı her şeyi tek ekranda görebilmeyi tercih ediyor.

## 6. Kişilik slider'ları
Mevcut CharacterTab'da görülen temel özellikler:
- Mizah
- Empati
- Özgüven
- Merak
- Otorite
- Analitik Mantık
- Sabır
- İletişim

Duygusal özellikler:
- Sinirlilik
- Hassasiyet
- Sosyal Zekâ
- Karizma

Not: Bu liste gelecekte değiştirilebilir; değişiklik mevcut tiplerle uyumlu yapılmalıdır.

## 7. Kaira kimliği — mevcut UI varsayılanları
- Ad: KAIRA
- Rol: Nexus Çekirdek Asistanı
- Köken: Sentetik Droit • Nexus OS
- Kısa tanım: Rasyonel, esprili ve duruma göre uyum sağlayan dijital karakter.

Temel kuralların mevcut varsayılanları:
- Bilmediği bilgiyi uydurmaz; belirsizliği açıkça belirtir.
- Kullanıcıya karşı saygılı kalır fakat gerektiğinde sınır koyar.
- Mizahı bağlama göre kullanır; kritik durumlarda ciddiyeti korur.
- Kişiliğini korurken konuşmanın bağlamına göre üslubunu değiştirebilir.

## 8. Görsel/ifade sistemi
- Droit ifadeleri ayrı asset olarak yönetiliyor.
- Firebase Storage + Firestore akışı daha önce kurulmuş durumda.
- Görsel yükleme, download URL ve Firestore yazma akışları daha önce başarıyla çalıştırıldı.
- Avatarların sosyal medya/profil kullanımında kırpılma problemi yaşandı; sonraki UI değişikliklerinde crop davranışı kontrol edilmeli.
- İfade sistemi karakterin ana kişilik modelinden ayrı bir görsel katmandır.

## 9. Kullanıcı çalışma tercihi
- Kullanıcı Türkçe ilerlemek istiyor.
- Kullanıcı “ok/değiştir/devam” gibi küçük onaylarla sürekli bölünmek istemiyor.
- Bir görev verildiğinde mümkün olan tüm hazırlık/değişiklik/test adımları art arda yapılmalı.
- Kullanıcının yapması gereken tek bir adım kalana kadar iş tamamlanmalı; sonra kısa şekilde ne kaldığı söylenmeli.
- Aynı ekran görüntüsünü tekrar tekrar istememek önemli.
- Kota nedeniyle gereksiz ekran görüntüsü talep edilmemeli.

## 10. Sohbet devamlılığı protokolü
Yeni sohbet açıldığında:
1. `PROJECT_STATE.md` okunur.
2. GitHub'daki mevcut kod durumu doğrulanır.
3. Kullanıcının son hedefi ve mevcut dosyalar arasında fark kontrol edilir.
4. Daha önce tamamlanmış iş tekrar yapılmaz.
5. Emin olunmayan geçmiş bilgi varsayılmaz; repo ve bu dosya esas alınır.
6. İş sonunda bu dosya güncellenir.

## 11. Çalışma durumu — 2026-08-25
- Proje aktif geliştirme aşamasında.
- CharacterTab mevcut ve tek ekranlı karakter/kişilik düzenleme yönünde ilerliyor.
- Kişilik slider'ları ve karakter kimliği alanları mevcut kodda bulunuyor.
- Proje hafızasının kalıcılaştırılması bu dosyayla başlatıldı.
- **Sonraki görev:** Bu dosyayı her önemli mimari/UI kararından sonra güncel tutmak ve gerekirse ayrı bir `SESSION_HANDOFF.md` ile son oturumun kısa teknik özetini eklemek.

## 12. Değişiklik günlüğü
### 2026-08-25
- Proje sürekliliği için `PROJECT_STATE.md` oluşturuldu.
- Repo, mimari, karakter modeli, UI kararları ve çalışma protokolü tek dosyada toplandı.

## 13. Değiştirilmemesi gereken ana kararlar
- KTM/KDM yaklaşımı korunacak.
- Droit'ler kişilik sahibi dijital varlıklar olarak tasarlanacak.
- Kişilik = sadece slider değildir; dinamik durum ve bağlamla birleşir.
- Character Studio masaüstü uygulaması hissinde, sade ve tek ekran odaklı kalacak.
- Yeni özellikler mevcut mimariyi bozmak yerine katmanlı olarak eklenecek.
