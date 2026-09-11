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
- PR #214 merge `c491c8c504788daedb211b0aff93ce5f5b8582b2`: canonical semantic runtime identity provider-neutral `llm_semantic_runtime`.
- PR #215 merge `be345044699939012f7605bdfd6f8136fd106a08`: model-generated provider etiketi trusted canonical provenance değildir.
- Provider/fallback transport + observability concern olarak kalır; canonical semantic/state authority değildir.

## 7. Response-generation measured fixes — CLOSED FOR KNOWN FAILURES
- Trace A PASS: rich context altında forbidden question/advice final metne sızmadı.
- Trace C/D: dynamic relationship/reaction state final dile gerçekten yansıyor.
- Trace F PASS: third-party open-thread state final response'a ulaşıyor.
- PR #217: `-ması/-mesi daha iyi olur` delivered-advice kaçağı regression ile kapatıldı.
- PR #218 merge `955c1fbfedc44379ffd4260034424d03bf04b3a6`: hurt/distancing canlı probe'da görülen `kendine dön biraz bugün` unsolicited-advice leak'i dar structural regression ile kapatıldı.
- Trace G provider parity production'da Gemini kapalı olduğu için tamamlanmış sayılmıyor.
- Live/provider keşif testleri maliyet nedeniyle durduruldu; yeni core validation deterministic/local/CI olmalı.

## 8. Core confidence reclassification — ACTIVE
- `21 senaryo / 423 tur GREEN` artık `production-grade robust core` kanıtı olarak yorumlanmıyor; bu baseline bilinen failure class'ları güçlü biçimde kilitler ama bilinmeyen failure class keşif gücü sınırlıdır.
- Red-team sonucu: core foundation GREEN, fakat adversarial/system validation henüz yeterli değil.
- Yeni faz: **Core Adversarial Validation / Soak / Counterfactual Matrix**.
- Bu fazda yeni feature/provider tuning yok; önce deterministic failure discovery.

## 9. Core Adversarial Validation Phase 1 — PR #219 ACTIVE
- Production behavior değişikliği yok; tests-only paket.
- 120 tur positive long-horizon stability.
- 120 tur injury → repair trajectory.
- 150 tur alternating harm / repair / neutral soak.
- Aynı stimulus altında trust × warmth × familiarity eksenlerinin tüm 8 uç kombinasyonu.
- Three-way discourse collision: iki unresolved third-party thread + pending Kaira question.
- Kural: RED çıkarsa assertion gevşetilmez; failure class izole edilir, minimal fix ancak kanıt sonrası yapılır.
- Provider/API çağrısı yok.

## 10. Sonraki adversarial kapılar
- Phase 1 GREEN olduktan sonra temporal robustness: gerçek/simüle wall-clock farkı.
- Persistence corruption/recovery: interrupted write + version mismatch.
- General semantic uncertainty damping: düşük-güven semantic input'ın mutation etkisi.
- Ardından deterministic 20–30 turluk daha serbest/spontane core conversation probes.
- Gerçek provider kabul testleri yalnız en sonda ve minimum sayıda yapılacak.
