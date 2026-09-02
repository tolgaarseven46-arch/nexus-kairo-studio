# AI CHANGELOG — Append-Only Contract / Seam Log

> **Yalnızca en üste satır ekle. Var olan satırı düzenleme/silme.**
> Kapsam: yalnız *seam* değişiklikleri — public arayüz, tip/şema, API sağlayıcısı,
> Firestore koleksiyon şekli, servis imzası, workflow sözleşmesi.
> İç düzenlemeler (refactor, stil, yorum) buraya yazılmaz; onlar commit geçmişindedir.
>
> Satır formatı:
> `YYYY-MM-DD [claude|codex] PR#<n> <sha7> — <seam> — <neden>`
>
> Merge çakışmasında iki tarafın kaydı da korunur (silme yok).

---

- 2026-09-02 [claude] PR#- <pending> — governance seam eklendi: `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md`, `docs/adr/0000-0003`, `docs/branch-protection.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/architecture-risky-paths.txt`, `.github/scripts/match-risky-paths.sh`, `.github/workflows/architecture-review.yml`, `.gitattributes`; `.github/workflows/ci.yml`'e docs-guard job'ı + action SHA-pin eklendi (mevcut test kapıları değişmedi) — Claude–Codex ortak çalışma sistemi minimum güvenli iskele.
