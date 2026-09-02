# AI CONTEXT — Statik Bağlam

> **Nadiren değişen** sabit bağlam. Canlı durum `PROJECT_STATE.md`'dedir.
> Kalıcı kararlar `docs/adr/`'dedir. Arayüz/seam değişiklikleri `AI_CHANGELOG.md`'dedir.
> Bu dosyayı yalnızca insan onaylı PR ile değiştir (bkz. `.github/CODEOWNERS`).

## 1. Doküman katmanları (rol ayrımı)

| Dosya | Rol | Değişim sıklığı | Sahip |
|---|---|---|---|
| `AI_CONTEXT.md` | Statik bağlam: mimari, komutlar, değişmezler, protokol | Nadir | İnsan (CODEOWNERS) |
| `PROJECT_STATE.md` | Canlı checkpoint: numaralı "state N" append-only günlüğü + her state altında `### Next verified development question` | Her anlamlı işte | Agent + insan |
| `AI_CHANGELOG.md` | Append-only contract/seam log: arayüz/şema/provider/tip değişiklikleri | Seam değiştikçe | Agent (yalnız ekleme) |
| `docs/adr/` | Kalıcı mimari kararlar (immutable, `Superseded by` ile geçersizlenir) | Karar aldıkça | İnsan onaylı |

`SESSION_HANDOFF.md` **yoktur ve eklenmeyecektir.** El-değiştirme işini
`PROJECT_STATE.md`'nin mevcut "state N + Next verified development question"
kadansı yapar. İkinci bir el-değiştirme dosyası sapma (drift) kaynağıdır.

## 2. Proje kimliği

- Proje: NEXUS / KAIRO Studio — Sentetik Droit karakter stüdyosu + otonom yaşam runtime'ı.
- Repo: `tolgaarseven46-arch/nexus-kairo-studio`
- Yığın: React 19 + Vite 6 + Tailwind 4, Express (`server.ts`), Firebase/Firestore/Storage.
- Sohbet sağlayıcısı: OpenRouter (varsayılan), Gemini yedek. Bkz. `docs/adr/0002`.
- Ürün/karakter modeli, KTM/KDM, davranış katmanları, autonomous-life durumu: `PROJECT_STATE.md`.

## 3. Komutlar

| İş | Komut |
|---|---|
| Kurulum (CI ile aynı) | `npm install --ignore-scripts` |
| Lint / tip kontrolü | `npm run lint` (`tsc --noEmit`) |
| Test | `npm test` (`vitest run`) |
| Mimari kontrat kapıları | `npm run test:contracts` |
| Beta regresyon kapısı | `npm run test:beta` |
| Production build | `npm run build` |
| Geliştirme | `npm run dev` |

Lockfile: repo hem `package-lock.json` hem `bun.lock` tutar (bilinçli). CI `npm install
--ignore-scripts` kullanır. Bir üçüncü lockfile eklenmez, mevcutlar silinmez.

## 4. Değişmezler (değiştirmek için ADR gerekir)

- KTM/KDM yaklaşımı korunur; mimari çöpe atılıp yeniden yazılmaz, katmanlı genişletilir.
- Droit'ler kişilik sahibi dijital varlıklar; kişilik = slider + dinamik durum + bağlam.
- Character Studio: sade, tek ekran, masaüstü uygulaması hissi.
- Sohbet sağlayıcısı kararı `docs/adr/0002`'ye bağlıdır; değiştirmek yeni ADR ister.
- `firestore.rules` şu an tam açık; bkz. `docs/adr/0003` — insan onayı olmadan deploy yok.
- `PROJECT_STATE.md` **UTF-8 + LF metin** olarak yazılır; asla binary araçtan geçirilmez
  (bkz. #21 bozulması / #22 kurtarması). CI bütünlük kontrolü bunu denetler.

## 5. Claude–Codex ortak çalışma protokolü

### 5.1 Şeritler
- Claude yalnızca `claude/*` dallarında çalışır; Codex yalnızca `codex/*` dallarında.
- Bir agent diğerinin dalına commit atmaz.
- Şerit başına aynı anda en fazla 1 açık PR.
- `main`'e doğrudan push yok; self-merge yok; her değişiklik PR + 1 insan onayı.

### 5.2 Atfedilebilirlik
- Her commit mesajı `Agent: claude` veya `Agent: codex` trailer'ı taşır.
- Her PR `agent:claude` veya `agent:codex` etiketini taşır.

### 5.3 Dosya yazım disiplini
- `AI_CHANGELOG.md`: yalnız **en üste** satır eklenir, eski satır düzenlenmez.
  Format: `YYYY-MM-DD [claude|codex] PR#<n> <sha7> — <seam> — <neden>`
  Çakışmada iki kayıt da korunur.
- `PROJECT_STATE.md`: mevcut numaralı state formatı korunur; yeni state en sona eklenir.
  Davranış/mimari değişikliğinde güncellenmesi **CI docs-guard'da zorunludur**.
- `docs/adr/`: kabul edilmiş ADR düzenlenmez; `Superseded by ADR-XXXX` ile geçersizlenir.

### 5.4 Sır (secret) kuralı
- `.env` okunmaz, içeriği echo/log/PR/changelog'a yazılmaz.
- Changelog/PR/ADR yalnızca anahtar **adına** atıf yapar (`OPENROUTER_API_KEY`), değerine değil.

### 5.5 Geri alma / tie-break
- Bir agent'ın hatalı merge'ü, revert PR'ı ile geri alınır (insan onaylı). Örnek: #22.
- Çakışan ADR'lerde son sözü insan (CODEOWNERS) söyler.

## 6. Architecture review — üç zorunlu mekanizma

`.github/workflows/architecture-review.yml` uygular:

1. **Riskli path classifier → etiket.** PR diff'i `.github/architecture-risky-paths.txt`
   ile eşleşirse `architecture-review-required` etiketi eklenir ve `architecture-review`
   commit status'u `pending`'e çekilir. Eşleşme yoksa etiket kaldırılır, status `success`.
2. **Sonuç head commit SHA'ya bağlıdır.** İnsan onayı yalnız `/arch-approve <sha>`
   yorumuyla verilir; workflow yorumdaki SHA'yı PR head SHA ile karşılaştırır.
   Eşleşirse **sadece o SHA** için `architecture-review` status = `success` yazılır.
3. **Yeni commit eski review'ı geçersiz kılar.** `synchronize` olayında yeni head
   SHA için `success` yoktur (status per-SHA'dır); workflow ayrıca status'u açıkça
   `pending`'e çeker ve sticky yorumu "previous architecture review invalidated" yapar.

`/arch-approve` yetkisi yalnız `OWNER`/`MEMBER`/`COLLABORATOR` ilişkisine sahiptir.
`architecture-review` zorunlu status check'tir. Kurulum: `docs/branch-protection.md`.

## 7. Yeni oturum açılışı (agent)

1. `AI_CONTEXT.md` (bu dosya) → `PROJECT_STATE.md` son birkaç state → son 10 ADR başlığı okunur.
2. `git fetch` + `origin/main` ile mevcut kod doğrulanır.
3. Kullanıcının son hedefi ile repo arasındaki fark kontrol edilir; tamamlanmış iş tekrar edilmez.
4. Emin olunmayan geçmiş bilgi varsayılmaz; repo + bu katman esas alınır.
5. İş sonunda `PROJECT_STATE.md`'ye yeni state eklenir (+ gerekiyorsa `AI_CHANGELOG.md` / yeni ADR).

## 8. Değişiklik disiplini — Hata Azaltma Protokolü

> Kalıcı proje geliştirme yasası (bkz. `docs/adr/0007`). Her agent her değişiklikte
> uyar; **B/C sınıfı** (davranış/mimari/kontrat) değişikliklerinde zorunludur.
> "B/C sınıfı" = §6 riskli path'e dokunan veya kabul edilmiş bir ADR'yi ilgilendiren değişiklik.

### 8.1 Prensipler

1. **Kanıt standardı.** Varsayım yok, kanıt var. Kod/log/test'ten doğrula.
   **Test yeşil olması davranışın doğru olduğu anlamına gelmez** — yeşil suite
   yalnızca yazılmış assertion'ların geçtiğini gösterir.
2. **Minimal repro + karşı-örnek.** Önce bug'ı en küçük senaryoda üret. Sonra
   ters/komşu örneklerle (yakın-ama-farklı girdiler) düzeltmeyi **çürütmeye çalış**;
   çürütülemezse geçerlidir.
3. **Tek karar kaynağı.** B/C değişikliklerinde davranışı belirleyen tek yetkili
   karar/kaynak **yazılı olarak** doğrulanmalı (ADR, `PROJECT_STATE` state'i veya
   kullanıcı talimatı) — sözlü/örtük değil.
4. **Etki haritası.** B/C değişikliklerinde etki haritası **güncel dependency/consumer
   haritasına** dayanır: neyin bu modülü import ettiği, hangi katmanın çıktısını
   tükettiği koddan çıkarılır; "muhtemelen etkilenmez" yasak.
5. **Golden long-session regression.** State/relationship/behavior değişikliklerinde
   uzun-oturum golden regression testi CI'da **zorunlu** çalışır; PR ilgili golden/
   long-session testini **ekler veya günceller** (bkz. §8.2).
6. **İkinci göz.** B/C değişikliklerinde §6 Claude–Codex architecture review
   (`/arch-approve <head-sha>`) ikinci göz olarak **zorunludur**.
7. **Tekrar eden bug sınıfı → root-cause.** Aynı bug sınıfı ikinci kez görülürse,
   yeni patch eklemeden **önce** root-cause incelemesi yapılır ve bulgu
   `PROJECT_STATE.md`'ye bir state olarak yazılır. Semptom-üstüne-patch yasak.
8. **Feature flag + eski/yeni karşılaştırma.** Büyük ve geri dönüşü riskli behavior
   değişiklikleri feature flag arkasına alınır (flag OFF = eski davranış bit-birebir),
   ve eski/yeni davranış aynı golden senaryoda karşılaştırılıp PR'da raporlanır.
9. **KNT telemetry görünürlüğü.** Yeni kritik state/decision alanı KNT
   telemetry'de (trace + `testSessionLayerAudit` + KNT export) **görünmeden merge edilmez**.
10. **Çürütücü test zorunlu.** Fix'i *doğrulayan* test kadar, fix'i *çürütmeye çalışan*
    test de yazılır (yanlış-pozitif/yanlış-negatif komşu vakalar).

### 8.2 CI ile otomatik zorlanan maddeler

`.github/workflows/ci.yml` `behavior-guard` job'ı (girdi: `.github/behavior-critical-paths.txt`)
— bir behavior-critical path'e dokunan PR şunları içermek **zorundadır**:

| Madde | CI kapısı |
|---|---|
| §8.5 golden regression testi eklendi/güncellendi | `behavior-guard`: diff'te `*Regression*` / `*GoldenSession*` / `*LongSession*` test dosyası olmalı |
| §8.10 fix + çürütücü test | `behavior-guard`: diff'te en az bir `src/**/*.test.ts` olmalı |
| §8.5 golden long-session her PR'da koşar | `validate` job'ı `test:beta` + `Beta conversation acceptance` adımları (uzun-oturum regression'ları içerir) |
| §8.3 / §8.7 doküman izi | `docs-guard`: riskli path → `PROJECT_STATE.md` veya `docs/adr/**` güncellenmiş olmalı |
| §8.6 ikinci göz | `architecture-review.yml`: riskli path → `architecture-review-required` + `/arch-approve <head-sha>` |
| §8.1 doğrulama komutları | `validate` job'ı `lint` + `test` + `build` |

**CI ile zorlanamayan (insan/review + PR şablonu ile):** §8.1 "kanıt standardı",
§8.2 "minimal repro + karşı-örneğin gerçekten çürütücü olması", §8.3 karar kaynağının
doğruluğu, §8.4 etki haritasının eksiksizliği, §8.7 root-cause'un yeterliliği,
§8.8 "büyük/riskli" takdiri, §8.9 telemetri alanının anlamlılığı. Bunlar
`.github/pull_request_template.md` "Hata Azaltma Protokolü" bölümü + architecture
review ile denetlenir.
