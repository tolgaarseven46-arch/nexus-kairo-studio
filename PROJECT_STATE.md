# KAIRO PROJECT STATE

> Bu dosya projenin **aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz. Ayrıntılı tarih Git geçmişi, `AI_CHANGELOG.md` ve `docs/adr/**` içindedir.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology / syntax / discourse katmanları typed evidence üretir; semantic truth canonical L6 gateway'de oluşur.
- Downstream raw-text reparse veya ikinci semantic authority yok.
- `RelationshipReducer`, social appraisal, memory, dialogue decision, behavior/response ve persistence ownership sınırları korunur.
- Provider/API seçimi canonical semantic truth veya deterministic architecture proof değildir.
- Yeni regex/classifier/phrase patch yalnız ölçülmüş failure class ile gerekçelendirilir.
- Runtime provider/fallback kimliği observability concern'dür; canonical semantic authority provider-neutral kalır.

## 2. Language / canonical foundation — CLOSED
- PR #192–#196: provider-neutral Turkish morphology evidence, runtime integration, bounded local semantic acceptance ve L7 field-level provenance tamamlandı.
- Zero-parse / ambiguity abstention korunur.
- Typed evidence canonical interpretation'ı yalnız gateway'de reconcile eder; raw text downstream yeniden parse edilmez.
- Frozen Phase-0 baseline: 21 senaryo / 423 tur; sonraki behavior değişikliklerinde regression proof olarak korunur.

## 3. Relationship / memory / persistence foundation — CLOSED
- PR #199: provider-free same-stimulus relationship A/B acceptance.
- PR #202: long-horizon relationship progression + persistence continuity.
- PR #203: memory + relationship combined behavior proof.
- PR #204: request-vs-persisted relationship effective-state arbitration.
- PR #205: mixed-provider continuity regression test canonical selector seam'ine hizalandı; production behavior değişmedi.

## 4. State mutation concurrency / ownership — CLOSED
- PR #206: distinct-request state-owner lost-update race için distributed lease serialization.
- PR #207: requestId-less `/api/chat` çağrıları da coordination/state-owner serialization'a girer.
- PR #210: bounded clock-skew takeover safety.
- PR #211: ownership-loss propagation / stale-holder pre-persistence fencing merge edildi.
- Canonical invariant: authoritative lease ownership kaybı tespit edilirse stale holder persistence başlamadan fail-closed olur; crash recovery başka owner için korunur.

## 5. Counterfactual / discourse authority — CLOSED
- PR #209: multi-turn counterfactual replay proof; lived self-fact revision, pending-question dependency ve third-party open-thread resumption history intervention ile doğrulandı.
- PR #213 merge commit: `fa91edec9cd8169e4428205f8b5fc4d31e47860a`.
- Ambiguous open-thread resumption dialogue decision authority altında bounded clarification üretir; semantic authority'ye yeni parser eklenmedi.

## 6. Provider / canonical boundary — CLOSED
### PR #214 — provider-neutral semantic runtime identity
- Merge commit: `c491c8c504788daedb211b0aff93ce5f5b8582b2`.
- `resolveServerLanguageUnderstanding` artık canonical semantic provider'ı requested transport'tan (`openrouter` / `gemini`) türetmez.
- Stable canonical runtime identity: `llm_semantic_runtime`.
- `preferredProvider` yalnız text-generation transport selection/fallback için kullanılır.
- OpenRouter→Gemini fallback canonical semantic authority adını değiştirmez.
- Regression contract: `src/services/serverLanguageUnderstandingProviderBoundaryContracts.test.ts`.
- ADR: `docs/adr/2026-09-11-provider-neutral-canonical-semantic-boundary.md`.
- PR #214 FULL CI + Architecture Review PASS.

### PR #215 — trusted runtime semantic provenance
- Merge commit: `be345044699939012f7605bdfd6f8136fd106a08`.
- Model-generated JSON içindeki `evidence.provider` canonical provenance olarak güvenilmez.
- `semantic_provider` sonuçlarında LLM evidence provider etiketi server boundary tarafından `llm_semantic_runtime` olarak overwrite edilir.
- Non-LLM evidence ve `client_shared` / `fallback_regex` kaynakları değiştirilmez.
- Model kendi canonical provider kimliğini spoof edemez.
- PR #215 FULL CI #2705 PASS; Architecture Review #823 PASS.

## 7. L7 semanticFieldProvenance audit — PASS / NO PATCH NEEDED
- `semanticFieldProvenance` observational sidecar'dır; canonical semantic authority değildir.
- Current implementation yalnız `typed_turkish_linguistic_evidence` cue'larından field-level provenance üretir.
- Model-supplied `evidence.provider` bu sidecar'a provider truth olarak taşınmaz.
- PR #215 sonrası aynı provider-provenance failure class için ek sızıntı doğrulanmadı.

## 8. Current main / CI checkpoint
- Date: 2026-09-11.
- Verified main after provider/canonical work: `0dcb5965750b30f59fa29623f6378857f87ccdc4`.
- PR #214: merged, full CI + Architecture Review green.
- PR #215: merged, full CI #2705 + Architecture Review #823 green.
- PR #216: active checkpoint refresh merged.
- Open provider/canonical PR: none at this checkpoint.
- New downstream semantic authority introduced: NO.
- External AI provider made canonical authority: NO.
- Provider fallback may change transport/observability metadata but not canonical semantic identity/state authority.

## 9. Response-generation validation — ACTIVE
- Claude response-generation audit sonucu: canonical/core architecture için yeni patch gerekçesi yok; gerçek provider final-text trace fazı açık.
- Güncel kod auditinde G4 social appraisal'ın tur başına bir kez çözüldüğü ve relationship/affect/reactionMode zincirinin aynı appraisal sonucundan beslendiği doğrulandı.
- Canonical prompt builder WHAT/WHETHER kararlarını tek `KairaResponsePlan` authority'sinde serialize eder; speech identity HOW-only kalır.
- Discourse state dialogue decision katmanına gerçek input olarak taşınır; final natural-language realization ayrıca trace edilmelidir.
- Ölçülmüş delivered-text failure: `isTurkishAdviceAct("aranızda kalması daha iyi olur")` current main üzerinde `false` döndürdü. Bu, advice permission authority değişikliği değil; final delivery structural recognizer coverage açığıdır.
- PR #217 bu dar bug-class için nominalized `-ması/-mesi daha iyi olur` recognizer coverage + false-positive regression ekler. `yarın hava daha iyi olur` advice olarak sınıflandırılmamalıdır.
- PR #217 sonrası sıradaki doğrulama sırası: TRACE A (forbidden question/advice + rich memory) → TRACE C/D (same stimulus, different relationship/reaction state) → TRACE F (third-party resume) → TRACE E (memory phrasing) → TRACE G (Gemini/OpenRouter parity).

## 10. Sıradaki kapılar
- Yeni işi yalnız gerçek `main` üzerinde ölçülmüş failure class / açık contract gap / doğrulanmış regression üzerinden seç.
- Provider/canonical boundary için yeni patch üretmeden önce concrete counterexample veya inconsistent runtime evidence göster.
- Response-generation trace fazında canonical/state testlerini final generated-text E2E kanıtı gibi sunma; gerçek provider candidate/final reply ayrımını gözle.
- `PROJECT_STATE.md` geçmiş PR günlüğü değildir; ayrıntılı tarih için Git/`AI_CHANGELOG.md`/ADR kullan.
