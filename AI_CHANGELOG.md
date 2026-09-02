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

- 2026-09-02 [claude] PR#26 <pending> — canonical behavior seam (ADR-0006 PR1+PR2): new `src/types/semanticInterpretation.ts` (SemanticInterpretation@2), `src/types/kairaBehaviorPlan.ts` (HardConstraintSet / SoftTendencyProfile / KairaPlanProjections), services `semanticInterpretationSchema.ts`, `semanticInterpretationLegacyProjection.ts` (bidirectional SemanticEvent↔@2 shim; lexical hit = candidate only), `relationshipReducer.ts` + `relationshipReducerConfig.ts` (pure `reduceRelationshipTurn`), `kdmRelationshipReducerBridge.ts`, `kairaHardConstraints.ts` / `kairaSoftTendencies.ts` / `kairaPlanResolver.ts`; `src/config/canonicalBehaviorFlags.ts` (flags SEMANTIC_SCHEMA_V2 / RELATIONSHIP_REDUCER_V2 / PLAN_RESOLVER_V2 / CANONICAL_PROMPT_BUILDER / UNIFIED_GUARD_PASS, all default OFF = byte-identical legacy). `kdmConsistencyEngine.ts` exports `applyIntegratedBehaviorPolicy` / `semanticPattern` / `semanticIntentToKdm` / `semanticSentimentToKdm` and early-returns into the canonical bridge when RELATIONSHIP_REDUCER_V2 is on. `kairaResponsePlan.ts` `KairaResponsePlan` gains optional canonical fields (resolver / opennessAxis / warmthAxis / guardedness / intimacyCeiling / requiredContent / hardReasons / uncertainty / projections). Config `config/kaira-character-policy.json`, `config/relationship-reducer.json`. `docs/adr/0006`.
- 2026-09-02 [claude] PR#- <pending> — governance seam: Hata Azaltma Protokolü kalıcı geliştirme yasası olarak eklendi. `AI_CONTEXT.md §8` (normatif tek kaynak), `docs/adr/0007`, `.github/behavior-critical-paths.txt` (yeni), `.github/workflows/ci.yml`'e `behavior-guard` job'ı (behavior-critical path → `src/**/*.test.ts` + `*Regression*`/`*GoldenSession*`/`*LongSession*` testi zorunlu), `.github/pull_request_template.md`'ye "Hata Azaltma Protokolü" bölümü, `CLAUDE.md`/`AGENTS.md` pointer'ı — tekrar eden bug sınıflarını CI + review + PR şablonuyla zorlamak.
- 2026-09-02 [codex] PR#- <pending> — CI conversation-acceptance seam eklendi: full suite öncesinde long-session consistency, qualitative HOW, controlled spontaneity, continuity, 20-turn persistence, language self-drift ve final ResponsePlan authority tek bir kalıcı beta acceptance kapısında çalışıyor — ürün konuşma kalitesindeki regressions daha erken ve tek checkpoint'te görülsün.
- 2026-09-02 [codex] PR#- <pending> — beta regression seam sıkılaştırıldı: `test:beta` artık epistemic runtime, controlled spontaneity, autonomous-state chat wiring ve beta conversation continuity sözleşmelerini full suite öncesinde zorunlu çalıştırıyor — ileri beta davranışındaki regressions daha erken fail etsin.
- 2026-09-02 [claude] PR#- <pending> — governance seam eklendi: `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `CLAUDE.md`, `AGENTS.md`, `docs/adr/0000-0003`, `docs/branch-protection.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/architecture-risky-paths.txt`, `.github/scripts/match-risky-paths.sh`, `.github/workflows/architecture-review.yml`, `.gitattributes`; `.github/workflows/ci.yml`'e docs-guard job'ı + action SHA-pin eklendi (mevcut test kapıları değişmedi) — Claude–Codex ortak çalışma sistemi minimum güvenli iskele.
