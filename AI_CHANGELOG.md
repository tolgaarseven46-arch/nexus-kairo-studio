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

- 2026-09-02 [codex] PR#- <pending> — CI conversation-acceptance seam eklendi: full suite öncesinde long-session consistency, qualitative HOW, controlled spontaneity, continuity, 20-turn persistence, language self-drift ve final ResponsePlan authority tek bir kalıcı beta acceptance kapısında çalışıyor — ürün konuşma kalitesindeki regressions daha erken ve tek checkpoint'te görülsün.
- 2026-09-02 [codex] PR#- <pending> — beta regression seam sıkılaştırıldı: `test:beta` artık epistemic runtime, controlled spontaneity, autonomous-state chat wiring ve beta conversation continuity sözleşmelerini full suite öncesinde zorunlu çalıştırıyor — ileri beta davranışındaki regressions daha erken fail etsin.
- 2026-09-02 [claude] PR#- <pending> — governance seam eklendi: `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md`, `docs/adr/0000-0003`, `docs/branch-protection.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/architecture-risky-paths.txt`, `.github/scripts/match-risky-paths.sh`, `.github/workflows/architecture-review.yml`, `.gitattributes`; `.github/workflows/ci.yml`'e docs-guard job'ı + action SHA-pin eklendi (mevcut test kapıları değişmedi) — Claude–Codex ortak çalışma sistemi minimum güvenli iskele.
