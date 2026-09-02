## Özet

<!-- Ne değişti, neden? -->

## Ajan

- [ ] `agent:claude` **veya** `agent:codex` etiketi eklendi
- [ ] Dal adı `claude/*` **veya** `codex/*`
- [ ] Commit mesajlarında `Agent: claude|codex` trailer'ı var

## Doküman katmanları

- [ ] Davranış/mimari değişti → `PROJECT_STATE.md`'ye yeni state eklendi **veya** yeni `docs/adr/NNNN-*.md`
- [ ] Public arayüz / tip / şema / sağlayıcı seam'i değişti → `AI_CHANGELOG.md`'ye en üstten satır eklendi
- [ ] Kabul edilmiş bir ADR ile çelişki yok (varsa: yeni ADR + eski ADR `Superseded by`)
- [ ] `PROJECT_STATE.md`'ye dokunulduysa UTF-8 + LF metin, binary değil

## Architecture review

- [ ] Riskli path'e dokunuldu mu? (`.github/architecture-risky-paths.txt`)
  - Evetse: `architecture-review-required` etiketi bekleniyor ve merge, güncel head
    SHA için `/arch-approve <sha>` insan onayı gerektirir.
  - Yeni commit push'ladıysam önceki architecture review **geçersiz** oldu; yeniden onay gerekir.

## Güvenlik

- [ ] `.env` içeriği / sır **değeri** hiçbir dosyaya, log'a, PR metnine yazılmadı (yalnız ad geçebilir)
- [ ] `firestore.rules` / `firestore.indexes.json` değiştiyse `docs/adr/0003` gözden geçirildi; insan onayı olmadan deploy yok

## Hata Azaltma Protokolü (B/C sınıfı = riskli path veya ADR'yi ilgilendiren değişiklik — `AI_CONTEXT.md` §8)

<!-- B/C değilse bu bölümü "N/A — B/C sınıfı değil" ile geçebilirsin. -->

- [ ] **Kanıt:** iddialar koddan/log'dan/testten doğrulandı; "test yeşil = davranış doğru" varsayılmadı
- [ ] **Minimal repro + karşı-örnek:** bug en küçük senaryoda üretildi; düzeltme ters/komşu örneklerle çürütülmeye çalışıldı ve dayandı
- [ ] **Tek karar kaynağı:** davranışı belirleyen yetkili karar yazılı (ADR / `PROJECT_STATE` state / kullanıcı talimatı) — hangisi: __________
- [ ] **Etki haritası:** güncel dependency/consumer haritasına dayanıyor (kim import ediyor / kimin çıktısını tüketiyor) — özet: __________
- [ ] **Golden long-session regression** eklendi/güncellendi ve yeşil (state/relationship/behavior değişikliğinde)
- [ ] **İkinci göz:** `architecture-review-required` alındı, `/arch-approve <head-sha>` bekleniyor
- [ ] **Tekrar eden bug sınıfı** ise: patch'ten önce root-cause incelemesi yapıldı ve `PROJECT_STATE.md`'ye yazıldı
- [ ] **Feature flag + eski/yeni karşılaştırma:** büyük/geri dönüşü riskli behavior değişikliğinde flag arkasında; flag OFF = eski davranış; karşılaştırma PR'da raporlandı
- [ ] **KNT telemetry:** yeni kritik state/decision alanı trace + `testSessionLayerAudit` + KNT export'ta görünüyor
- [ ] **Çürütücü test:** fix'i doğrulayan test kadar fix'i çürütmeye çalışan test de eklendi

## Doğrulama

- [ ] `npm install --ignore-scripts`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
