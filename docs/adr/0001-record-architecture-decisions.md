# ADR-0001: Mimari kararlar ADR olarak kaydedilir

- **Durum:** Accepted
- **Tarih:** 2026-09-02
- **Karar veren:** CODEOWNERS
- **İlgili PR:** ilk governance PR'ı

## Bağlam

Repo iki yapay zekâ ajanı (Claude ve Codex) tarafından ortak geliştiriliyor
(`claude/*` ve `codex/*` dalları aktif). Mimari kararlar bugüne kadar yalnızca
commit mesajlarında ve `PROJECT_STATE.md`'nin numaralı state günlüğünde kalıyordu;
bir ajan, başka bir ajanın aldığı kararı fark etmeden geri alabiliyor. Kalıcı,
atıf verilebilir ve geç değiştirilemez bir karar kaydına ihtiyaç var.

## Karar

Her davranış/mimari/altyapı kararı `docs/adr/NNNN-kebab-baslik.md` dosyası olarak
kaydedilir. Şablon: `docs/adr/0000-template.md`.

Kurallar:

- Kabul edilmiş (`Accepted`) ADR **düzenlenmez**. Değişiklik yeni ADR gerektirir;
  eski ADR `Superseded by ADR-XXXX` olarak işaretlenir.
- Kod, kabul edilmiş bir ADR ile çelişecek şekilde değiştirilemez.
- Riskli path'e dokunan PR'lar `docs/adr/**` veya `PROJECT_STATE.md` güncellemesi
  içermek zorundadır (CI `docs-guard` job'ı bunu denetler).
- ADR numaraları monoton artar; boşluk bırakılmaz.
- `PROJECT_STATE.md` ile ADR çakışırsa ADR bağlayıcıdır; `PROJECT_STATE.md` düzeltilir.

## Sonuçlar

- Olumlu: kararlar tek yerde, sürüm kontrollü, ajanlar arası görünür.
- Olumsuz / takas: her mimari değişiklik ek bir dosya yazma yükü getirir.
- Etkilenen seam: `.github/workflows/ci.yml` (`docs-guard`), `AI_CONTEXT.md` §1/§4.
