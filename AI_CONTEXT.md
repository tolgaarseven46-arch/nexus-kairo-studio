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
