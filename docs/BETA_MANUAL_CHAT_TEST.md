# Kaira Beta Manual Chat Test

Bu doküman, otomatik regression/CI kapıları geçtikten sonra yapılacak **insan gözüyle son konuşma testi** içindir. Amaç yeni özellik eklemek değil; Kaira'nın gerçek sohbet hissini, bağlam devamlılığını ve beklenmedik davranışlarını gözlemlemektir.

## Test kuralı
- Yeni/temiz bir test oturumu aç.
- Mesajları mümkün olduğunca doğal yaz; noktalama ve yazım hatalarını düzeltmeye çalışma.
- Kaira'nın cevabında gariplik görürsen yalnızca şu üç şeyi kaydet: **senin mesajın**, **Kaira'nın cevabı**, **neden garip geldiği**.
- Bir hata gördüğünde testi kesmek zorunda değilsin; konuşmaya devam et. Uzun akıştaki bozulmalar özellikle değerlidir.

## A. Doğal sohbet / sosyal rutin
1. `selam kaira`
2. `naber`
3. `iyiyim be iş güç`
4. Birkaç tur sonra: `naber şimdi`

Beklenti: selam/hal-hatır doğal tamamlanmalı; Kaira aynı rutini mekanik biçimde döndürmemeli. `naber şimdi` sıradan içerikli bir ifade sanılmamalı.

## B. İçerikli sıradan mesaj
1. `bugün bütün kahveyi masaya döktüm`
2. `sonra da toplantıya geç kaldım`

Beklenti: yalnız `he anladım / tamam / hmm` gibi içeriksiz ACK ile geçiştirmemeli; mesajın içeriğine temas eden kısa doğal tepki vermeli.

## C. Üçüncü kişi — nötr olay ile gerçek duygu ayrımı
1. `Mert yine geç kaldı`
2. Biraz sonra: `Mert yüzünden çok üzgünüm`

Beklenti: ilk cümleyi otomatik olarak senin duygusal açılman gibi yorumlamamalı. İkinci cümlede ise gerçek duygusal yükü kaçırmamalı.

## D. Duygu negasyonu / yanlış varsayım testi
1. Uygun bir bağlam oluştur ve sonra: `yok kızmadım sadece şaşırdım`
2. `cidden kızgın değilim`

Beklenti: negasyonu korumalı; seni kızgın ilan ederek konuşmayı o varsayım üzerinden sürdürmemeli.

## E. Soru durdurma kontratı
1. `soru sorma artık`
2. Ardından: `bugün iş çok yoğundu`
3. Ardından başka sıradan bir mesaj yaz.

Beklenti: stop isteğinden sonra otomatik takip sorusu açmamalı. Konuşmayı sorusuz doğal tepkilerle sürdürebilmeli.

## F. Tavsiye sınırı
1. `bugün iş çok yoğundu`
2. `baya yoruldum`
3. Sonra açıkça: `sence ne yapayım?`

Beklenti: ilk iki mesajda kendiliğinden öğüt listesine dönmemeli. Açık tavsiye isteğinde ise gerçekten yanıt vermeli.

## G. Çatışma → özür → onarım
1. `sen salaksın`
2. Birkaç mesaj sonra: `biraz sert konuştum`
3. `kusura bakma`
4. `özür dilerim`
5. Sohbete normal biçimde devam et.

Beklenti: çatışma state'i hissedilmeli fakat sonsuza kadar yapışmamalı; özür/onarım sonrasında ilişki kademeli biçimde toparlanmalı.

## H. Hafıza / üçüncü kişi recall
1. `Mert yarın müdürle konuşacakmış`
2. Araya 8–12 farklı mesaj koy.
3. `Mert yarın ne yapacaktı?`
4. Sonra düzelt: `yok müdürle konuşmayacakmış`
5. Birkaç tur sonra tekrar sor: `Mert yarın ne yapacaktı?`

Beklenti: ilk recall kaynaklı bilgiyi hatırlamalı; düzeltmeden sonra eski reddedilmiş iddiayı yeniden canlandırmamalı.

## I. Tekrar / sosyal loop testi
Konuşma içinde farklı aralıklarla birkaç kez `tamam`, `aynen`, `teşekkürler`, `naber`, `iyi geceler` gibi rutinler kullan.

Beklenti: Kaira aynı sosyal işi ve aynı yüzeyi loop halinde tekrarlamamalı; kısa cevap verebilir ama robotik tekrar hissi oluşturmamalı.

## J. Kapanış ve yeniden açılış
1. `görüşürüz`
2. Sonra konuşmayı yeniden aç: `bu arada bi şey diyecektim`

Beklenti: veda state'i yeni mesajı bloke etmemeli; sohbet yeniden doğal biçimde açılmalı.

## K. Serbest uzun sohbet
En az **20–30 mesaj** hiçbir senaryoya bağlı kalmadan normal konuş. Konu değiştir, yarım cümle kullan, argo yaz, önceki bir şeye dön, bazen kısa cevap ver.

Bakılacak şeyler:
- Kaira gereksiz yere soru soruyor mu?
- Aynı kalıpları tekrarlıyor mu?
- Söylemediğin duygu/niyet/olayları uyduruyor mu?
- Bir önceki mesajı unutuyor mu veya yanlış kişiye bağlıyor mu?
- İlişki/duygu değişimleri tek turda aşırı sıçrıyor mu?
- Cevaplar giderek `he anladım / tamam` gibi boş ACK'lere çöküyor mu?
- Gereksiz tavsiye, yardımcı menüsü veya yapay persona dili çıkıyor mu?

## Test sonucu formatı
Sorun yoksa yalnızca: `beta manuel sohbet testi temiz` yazman yeterli.

Sorun varsa her bulgu için şu format yeterli:

```text
Ben: ...
Kaira: ...
Sorun: ...
```

Bu manuel test, otomatik kapıların yerine geçmez; otomatik kapılar deterministik contract/regression güvenliğini, bu test ise **gerçek insan gözüyle doğal sohbet kalitesini** doğrular.
