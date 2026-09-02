# ADR-0007: Hata Azaltma Protokolü — kalıcı geliştirme yasası

- **Durum:** Accepted
- **Tarih:** 2026-09-02
- **Karar veren:** CODEOWNERS
- **İlgili PR:** governance PR'ı
- **Not:** `docs/adr/0006` açık PR #26'da (canonical behavior authority) ayrılmıştır;
  bu ADR onun süreç tamamlayıcısıdır.

## Bağlam

KNT full-session forensic review'ları ve PR1 (#26) review'ı, aynı bug
sınıflarının (leksikal tek-etiket, ratchet, semptom-üstüne-patch, "test yeşil
ama davranış yanlış") tekrar ettiğini gösterdi. Değişiklik disiplini yazılı ve
kısmen otomatik zorlanır olmalı.

## Karar

Aşağıdaki **Hata Azaltma Protokolü** kalıcı proje geliştirme yasasıdır. Normatif
tam metni `AI_CONTEXT.md §8`'dedir (tek kaynak; burada tekrar edilmez).
Kapsam: her değişiklik prensipleri; **B/C sınıfı** (davranış/mimari/kontrat =
`.github/architecture-risky-paths.txt`'e dokunan veya kabul edilmiş bir ADR'yi
ilgilendiren) değişikliklerde zorunlu.

Prensipler (özet): kanıt standardı (test yeşil ≠ davranış doğru) · minimal repro
+ çürütücü karşı-örnek · yazılı tek karar kaynağı · güncel dependency/consumer
etki haritası · golden long-session regression · ikinci-göz architecture review ·
tekrar eden bug sınıfında önce root-cause · feature flag + eski/yeni karşılaştırma
· KNT telemetry görünürlüğü · çürütücü test.

## CI ile zorlanan maddeler

`.github/workflows/ci.yml`:

- **`behavior-guard`** (yeni; girdi `.github/behavior-critical-paths.txt`):
  behavior-critical path'e dokunan PR bir `src/**/*.test.ts` **ve** bir
  `*Regression*` / `*GoldenSession*` / `*LongSession*` test dosyası içermeli.
- **`docs-guard`**: riskli path → `PROJECT_STATE.md` veya `docs/adr/**`.
- **`validate`**: `test:contracts` + `test:beta` + `Beta conversation acceptance`
  (uzun-oturum regression'ları her PR'da koşar) + `lint` + `test` + `build`.
- **`architecture-review.yml`**: riskli path → `architecture-review-required` +
  `/arch-approve <head-sha>` (ikinci göz).

CI ile zorlanamayan maddeler `.github/pull_request_template.md` "Hata Azaltma
Protokolü" bölümü + architecture review ile denetlenir.

## Sonuçlar

- Olumlu: değişiklik disiplini tek yerde (AI_CONTEXT §8), yeni oturumlarda
  otomatik okunur (CLAUDE.md / AGENTS.md pointer'ları), kısmen CI-zorlanır.
- Olumsuz / takas: behavior PR'ları artık golden/long-session regression testi
  eklemeden CI'dan geçmez (bilinçli sürtünme).
- Etkilenen seam: `.github/workflows/ci.yml` (`behavior-guard`),
  `.github/behavior-critical-paths.txt` (yeni), `AI_CONTEXT.md §8`,
  `.github/pull_request_template.md`, `CLAUDE.md`, `AGENTS.md`.
